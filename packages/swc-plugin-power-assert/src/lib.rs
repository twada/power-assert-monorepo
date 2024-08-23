use std::sync::Arc;
use rustc_hash::{
    FxHashSet,
    FxHashMap
};
use swc_core::ecma::ast::{
    // op,
    Id,
    Program,
    Lit,
    Null,
    Str,
    Number,
    Stmt,
    Ident,
    IdentName,
    CallExpr,
    BinExpr,
    Expr,
    ExprOrSpread,
    Pat,
    Decl,
    VarDecl,
    VarDeclKind,
    VarDeclarator,
    Module,
    ModuleItem,
    ModuleDecl,
    ImportDecl,
    ImportSpecifier,
    ImportDefaultSpecifier,
    ImportStarAsSpecifier,
    ImportNamedSpecifier,
    ModuleExportName,
    MemberExpr,
    MemberProp,
    ComputedPropName,
    AssignExpr,
    AwaitExpr,
    CondExpr,
    NewExpr,
    UnaryExpr,
    UnaryOp,
    UpdateExpr,
    ObjectLit,
    PropOrSpread,
    Prop,
    KeyValueProp,
    PropName,
    Function,
    Callee
};
use swc_core::ecma::atoms::JsWord;
use swc_core::ecma::visit::{
    as_folder,
    FoldWith,
    VisitMut,
    VisitMutWith
};
use swc_core::common::{
    Span,
    Spanned
};
use swc_core::common::source_map::SmallPos;
use swc_core::common::util::take::Take;
use swc_core::plugin::plugin_transform;
use swc_core::plugin::metadata::{
    TransformPluginProgramMetadata,
    TransformPluginMetadataContextKind
};

#[derive(Debug, Clone, Eq, PartialEq)]
struct Utf8Pos(u32);

impl SmallPos for Utf8Pos {
    #[inline(always)]
    fn from_usize(n: usize) -> Utf8Pos {
        Utf8Pos(n as u32)
    }

    #[inline(always)]
    fn to_usize(&self) -> usize {
        self.0 as usize
    }

    #[inline(always)]
    fn from_u32(n: u32) -> Utf8Pos {
        Utf8Pos(n)
    }

    #[inline(always)]
    fn to_u32(&self) -> u32 {
        self.0
    }
}

#[derive(Debug, Clone, Eq, PartialEq)]
struct Utf16Pos(u32);

impl SmallPos for Utf16Pos {
    #[inline(always)]
    fn from_usize(n: usize) -> Utf16Pos {
        Utf16Pos(n as u32)
    }

    #[inline(always)]
    fn to_usize(&self) -> usize {
        self.0 as usize
    }

    #[inline(always)]
    fn from_u32(n: u32) -> Utf16Pos {
        Utf16Pos(n)
    }

    #[inline(always)]
    fn to_u32(&self) -> u32 {
        self.0
    }
}

#[derive(Debug)]
struct AssertionMetadata {
    ident_name: JsWord,
    callee_ident_name: JsWord,
    receiver_ident_name: Option<JsWord>,
    assertion_code: String,
    assertion_start_pos: Utf8Pos,
    contains_multibyte_char: bool,
    binary_op: Option<String>
}

#[derive(Debug)]
struct ArgumentMetadata {
    is_captured: bool,
    ident_name: JsWord,
    arg_index: usize,
    powered_ident_name: JsWord
}

pub struct TransformVisitor {
    span_offset: u32,
    powered_var_cnt: usize,
    argrec_var_cnt: usize,
    target_variables: FxHashSet<Id>,
    target_modules: FxHashMap<JsWord, FxHashSet<JsWord>>,
    assertion_metadata_vec: Vec<AssertionMetadata>,
    assertion_metadata: Option<AssertionMetadata>,
    argument_metadata_vec: Vec<ArgumentMetadata>,
    argument_metadata: Option<ArgumentMetadata>,
    is_runtime_imported: bool,
    do_not_capture_immediate_child: bool,
    code: Arc<String>
}

impl Default for TransformVisitor {
    fn default() -> Self {
        let mut visitor = TransformVisitor {
            span_offset: 0,
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: FxHashSet::default(),
            target_modules: FxHashMap::default(),
            assertion_metadata_vec: Vec::new(),
            assertion_metadata: None,
            argument_metadata_vec: Vec::new(),
            argument_metadata: None,
            do_not_capture_immediate_child: false,
            is_runtime_imported: false,
            code: Arc::new("".into())
        };
        for module_name in [
            "node:assert",
            "node:assert/strict",
            "assert",
            "assert/strict",
        ].iter() {
            visitor.target_modules.insert(JsWord::from(*module_name), FxHashSet::default());
        }
        {
            // allowlist for vitest
            let mut vitest_allowlist = FxHashSet::default();
            vitest_allowlist.insert(JsWord::from("assert"));
            visitor.target_modules.insert(JsWord::from("vitest"), vitest_allowlist);
        }
        visitor
    }
}

// /cwd is the root of sandbox
// https://github.com/swc-project/swc/discussions/4997
fn resolve_path_in_sandbox(filename: &String, cwd_str: &String) -> String {
    if filename.starts_with("file://") {
        let abs_path_like = filename.replace("file://", "");
        return resolve_path_in_sandbox(&abs_path_like, cwd_str);
    }
    if filename.starts_with(cwd_str) {
        let relative_path_from_cwd = filename.replace(cwd_str, "");
        return format!("/cwd{}", relative_path_from_cwd);
    }
    format!("/cwd/{}", filename)
}

impl From<&String> for TransformVisitor {
    fn from(code: &String) -> Self {
        TransformVisitor {
            code: Arc::new(code.into()),
            .. Default::default()
        }
    }
}

impl From<TransformPluginProgramMetadata> for TransformVisitor {
    fn from(metadata: TransformPluginProgramMetadata) -> Self {
        let code = match metadata.source_map.source_file.get() {
            Some(source_file) => {
                source_file.src.clone()
            },
            None => {
                let filename = metadata
                    .get_context(&TransformPluginMetadataContextKind::Filename)
                    .expect("filename should exist");
                // println!("filename: {:?}", filename);

                let cwd = metadata
                    .get_context(&TransformPluginMetadataContextKind::Cwd)
                    .expect("cwd should exist");
                // println!("cwd: {:?}", cwd);

                // let env = metadata
                //     .get_context(&TransformPluginMetadataContextKind::Env)
                //     .expect("env should exist");
                // println!("env: {:?}", env);  // "development"

                // /cwd is the root of sandbox
                // https://github.com/swc-project/swc/discussions/4997
                let path_in_sandbox = resolve_path_in_sandbox(&filename, &cwd);
                // println!("path_in_sandbox: {:?}", path_in_sandbox);
                // read all file contens into string
                let error_message = format!("failed to read file: {}", path_in_sandbox);
                let code = std::fs::read_to_string(path_in_sandbox).expect(&error_message);
                Arc::new(code)
            }
        };
        TransformVisitor {
            code,
            .. Default::default()
        }
    }
}

impl TransformVisitor {
    fn next_powered_runner_variable_name(&mut self) -> JsWord {
        self.powered_var_cnt += 1;
        format!("_pasrt{}", self.powered_var_cnt).into()
    }

    fn next_argrec_variable_name(&mut self) -> JsWord {
        self.argrec_var_cnt += 1;
        format!("_parg{}", self.argrec_var_cnt).into()
    }

    fn unset_argrec_variable_name(&mut self) {
        self.argrec_var_cnt -= 1;
    }

    fn clear_transformations(&mut self) {
        self.assertion_metadata_vec.clear();
        self.argument_metadata_vec.clear();
    }

    fn has_declarations_to_be_inserted(&mut self) -> bool {
        !self.assertion_metadata_vec.is_empty() || !self.argument_metadata_vec.is_empty()
    }

    fn has_declarations_and_imports_to_be_inserted(&mut self) -> bool {
        !self.is_runtime_imported || self.has_declarations_to_be_inserted()
    }

    fn replace_callee_with_powered_run (&self, powered_ident_name: &str) -> Callee {
        Callee::Expr(Box::new(
            Expr::Member(MemberExpr {
                span: Span::default(),
                obj: Box::new(Expr::Ident(powered_ident_name.into())),
                prop: MemberProp::Ident("run".into())
            })
        ))
    }

    fn apply_to_tap_if_exists_directly_under_the_current_node(&self, expr: &mut Box<Expr>, argrec_ident_name: &JsWord, f: &dyn Fn(&mut Vec<ExprOrSpread>, &mut IdentName)) -> bool {
        match expr.as_mut() {
            Expr::Call(CallExpr { callee: Callee::Expr(callee), args, .. }) => {
                match callee.as_mut() {
                    Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(prop_ident), .. }) => {
                        match obj.as_ref() {
                            Expr::Ident(obj_ident) if obj_ident.sym == *argrec_ident_name && prop_ident.sym == "tap" => {
                                f(args, prop_ident);
                                return true;
                            },
                            _ => {}
                        }
                    },
                    _ => {}
                }
            },
            _ => {}
        }
        false
    }

    fn replace_with_rec_if_tap_exists_directly_under_the_arg(&self, arg: &mut ExprOrSpread, argrec_ident_name: &JsWord) -> bool {
        self.apply_to_tap_if_exists_directly_under_the_current_node(&mut arg.expr, argrec_ident_name, &|_args, prop_ident| {
            prop_ident.sym = "rec".into();
        })
    }

    fn create_hint_object(&self, hint: &str) -> Expr {
        Expr::Object(ObjectLit{
            span: Span::default(),
            props: vec![
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident("hint".into()),
                    value: Box::new(Expr::Lit(Lit::Str(hint.into())))
                })))
            ]
        })
    }

    fn apply_binexp_hint(&self, arg: &mut ExprOrSpread, argrec_ident_name: &JsWord) {
        self.apply_to_tap_if_exists_directly_under_the_current_node(&mut arg.expr, argrec_ident_name, &|args, _prop_ident| {
            let value = &mut args[0];
            // let mut pos = &args[1];
            if let Expr::Bin(BinExpr { left, right, .. }) = value.expr.as_mut() {
                self.apply_to_tap_if_exists_directly_under_the_current_node(left, argrec_ident_name, &|args, _prop_ident| {
                    args.push(ExprOrSpread::from(Box::new(self.create_hint_object("left"))));
                });
                self.apply_to_tap_if_exists_directly_under_the_current_node(right, argrec_ident_name, &|args, _prop_ident| {
                    args.push(ExprOrSpread::from(Box::new(self.create_hint_object("right"))));
                });
            };
        });
    }

    fn wrap_with_rec_without_pos(&self, arg: &mut ExprOrSpread, argrec_ident_name: &str) {
        arg.expr.as_mut().map_with_mut(|ex: Expr| {
            Expr::Call(CallExpr {
                callee: Callee::Expr(Box::new(Expr::Member(
                    MemberExpr {
                        obj: Box::new(Expr::Ident(argrec_ident_name.into())),
                        prop: MemberProp::Ident("rec".into()),
                        ..Default::default()
                    }
                ))),
                args: vec![
                    ExprOrSpread::from(Box::new(ex))
                ],
                ..Default::default()
            })
        });
    }

    fn wrap_with_tap(&mut self, expr: &mut Expr, pos: &Utf16Pos) {
        let arg_rec = self.argument_metadata.as_mut().unwrap();
        arg_rec.is_captured = true;
        let argrec_ident_name = &arg_rec.ident_name;
        expr.map_with_mut(|ex: Expr| {
            Expr::Call(CallExpr {
                span: Span::default(),
                callee: Callee::Expr(Box::new(Expr::Member(
                    MemberExpr {
                        obj: Box::new(Expr::Ident(Ident::from(argrec_ident_name.to_owned()))),
                        prop: MemberProp::Ident("tap".into()),
                        ..Default::default()
                    }
                ))),
                args: vec![
                    ExprOrSpread::from(Box::new(ex)),
                    ExprOrSpread::from(Box::new(Expr::Lit(Lit::Num(Number::from(pos.to_u32() as f64)))))
                ],
                ..Default::default()
            })
        });
    }

    fn calculate_utf16_pos(&self, expr: &Expr) -> Utf16Pos {
        let assertion_metadata = self.assertion_metadata.as_ref().unwrap();
        let assertion_start_pos = &assertion_metadata.assertion_start_pos;
        let utf8_pos = self.calculate_utf8_pos(expr, assertion_start_pos);
        if !assertion_metadata.contains_multibyte_char {
            return Utf16Pos(utf8_pos.to_u32())
        }
        let utf8_pos_usize = utf8_pos.to_usize();
        let assertion_code = &assertion_metadata.assertion_code;
        let mut iter = assertion_code.chars();
        let mut current_utf16_pos = 0;
        let mut current_utf8_pos = 0;
        while current_utf8_pos < utf8_pos_usize {
            let c = iter.next().unwrap();
            current_utf8_pos += c.len_utf8();
            current_utf16_pos += c.len_utf16();
        }
        Utf16Pos(current_utf16_pos as u32)
    }

    fn calculate_utf8_pos(&self, expr: &Expr, assertion_start_pos: &Utf8Pos) -> Utf8Pos {
        match expr {
            Expr::Member(MemberExpr{ prop, .. }) => {
                match prop {
                    MemberProp::Computed(ComputedPropName{ span, .. }) => Utf8Pos(span.lo.to_u32() - assertion_start_pos.to_u32()),
                    MemberProp::Ident(IdentName { span, .. }) => Utf8Pos(span.lo.to_u32() - assertion_start_pos.to_u32()),
                    _ => Utf8Pos(expr.span_lo().to_u32() - assertion_start_pos.to_u32())
                }
            },
            Expr::Call(CallExpr{ callee: Callee::Expr(callee_expr), .. }) => {
                match callee_expr.as_ref() {
                    // for callee like `foo()`, foo's span is used
                    Expr::Ident(Ident { span, .. }) => Utf8Pos(span.lo.to_u32() - assertion_start_pos.to_u32()),
                    // for callee like `foo.bar()`, bar's span is used
                    Expr::Member(MemberExpr{ prop: MemberProp::Ident(IdentName { span, .. }), .. }) => Utf8Pos(span.lo.to_u32() - assertion_start_pos.to_u32()),
                    // otherwise, span of opening parenthesis is used
                    _ => self.search_pos_for("(", &callee_expr.span(), assertion_start_pos)
                }
            },
            // estree's LogicalExpression is mapped to BinaryExpression in swc
            Expr::Bin(BinExpr{ left, op, ..}) => self.search_pos_for(op.as_str(), &left.span(), assertion_start_pos),
            Expr::Assign(AssignExpr{ left, op, .. }) => self.search_pos_for(op.as_str(), &left.span(), assertion_start_pos),
            Expr::Cond(CondExpr{ test, .. }) => self.search_pos_for("?", &test.span(), assertion_start_pos),
            Expr::Update(UpdateExpr{ arg, op, prefix, .. }) => {
                if *prefix {
                    Utf8Pos(expr.span_lo().to_u32() - assertion_start_pos.to_u32())
                } else {
                    self.search_pos_for(op.as_str(), &arg.span(), assertion_start_pos)
                }
            },
            _ => Utf8Pos(expr.span_lo().to_u32() - assertion_start_pos.to_u32())
        }
    }

    fn search_pos_for(&self, search_target_str: &str, search_start_span: &Span, assertion_start_pos: &Utf8Pos) -> Utf8Pos {
        let search_start_pos = search_start_span.hi.to_usize() - assertion_start_pos.to_usize();
        let assertion_code: &String = &self.assertion_metadata.as_ref().unwrap().assertion_code;
        let found = assertion_code[search_start_pos..].find(search_target_str).unwrap_or(0);
        Utf8Pos((found + search_start_pos) as u32)
    }

    fn create_argrec_decl(&self, argument_metadata: &ArgumentMetadata) -> Stmt {
        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![
                VarDeclarator {
                    span: Span::default(),
                    name: Pat::Ident(argument_metadata.ident_name.clone().into()),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        callee: Callee::Expr(Box::new(Expr::Member(
                            MemberExpr {
                                obj: Box::new(Expr::Ident(argument_metadata.powered_ident_name.clone().into())),
                                prop: MemberProp::Ident("recorder".into()),
                                ..Default::default()
                            }
                        ))),
                        args: vec![
                            ExprOrSpread::from(Box::new(Expr::Lit(Lit::Num(Number::from(argument_metadata.arg_index as f64)))))
                        ],
                        ..Default::default()
                    }))),
                    definite: false
                }
            ],
            ..Default::default()
        })))
    }

    fn create_powered_runner_decl(&self, assertion_metadata: &AssertionMetadata) -> Stmt {
        let mut args = vec![
            ExprOrSpread::from(Box::new(
                match &assertion_metadata.receiver_ident_name {
                    Some(receiver_ident_name) => {
                        Expr::Member(
                            MemberExpr {
                                obj: Box::new(Expr::Ident(receiver_ident_name.clone().into())),
                                prop: MemberProp::Ident(assertion_metadata.callee_ident_name.clone().into()),
                                ..Default::default()
                            }
                        )
                    },
                    None => {
                        Expr::Ident(assertion_metadata.callee_ident_name.clone().into())
                    }
                }
            )),
            ExprOrSpread::from(Box::new(
                match &assertion_metadata.receiver_ident_name {
                    Some(receiver_ident_name) => {
                        Expr::Ident(receiver_ident_name.clone().into())
                    },
                    None => {
                        Expr::Lit(Lit::Null(Null { span: Span::default() }))
                    }
                }
            )),
            ExprOrSpread::from(Box::new(Expr::Lit(Lit::Str(Str::from(assertion_metadata.assertion_code.clone())))))
        ];

        if assertion_metadata.binary_op.is_some() {
            // add object expression { binexp: "===" } to args
            args.push(ExprOrSpread::from(Box::new(Expr::Object(ObjectLit{
                props: vec![
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: PropName::Ident("binexp".into()),
                        value: Box::new(Expr::Lit(Lit::Str(assertion_metadata.binary_op.as_ref().unwrap().clone().into())))
                    })))
                ],
                ..Default::default()
            }))));
        }

        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![
                VarDeclarator {
                    span: Span::default(),
                    name: Pat::Ident(assertion_metadata.ident_name.clone().into()),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        callee: Callee::Expr(Box::new(
                            Expr::Ident("_power_".into())
                        )),
                        args,
                        ..Default::default()
                    }))),
                    definite: false
                }
            ],
            ..Default::default()
        })))
    }

    fn create_power_assert_runtime_import_decl(&mut self) -> ModuleItem {
        self.is_runtime_imported = true;
        ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
            span: Span::default(),
            specifiers: vec![
                ImportSpecifier::Named(ImportNamedSpecifier {
                    local: "_power_".into(),
                    imported: None,
                    span: Span::default(),
                    is_type_only: false,
                })
            ],
            src: Box::new("@power-assert/runtime".into()),
            type_only: false,
            with: None,
            phase: Default::default()
        }))
    }

    fn capture_assertion(&mut self, n: &mut CallExpr, prop_ident_name: JsWord, obj_ident_name: Option<JsWord>) {
        let mut is_some_arg_captured = false;
        let powered_ident_name = self.next_powered_runner_variable_name();
        let assertion_start_pos = Utf8Pos(n.span.lo.to_u32());

        let start_pos_usize = (n.span.lo.to_u32() - self.span_offset - 1) as usize;
        let end_pos_usize = (n.span.hi.to_u32() - self.span_offset - 1) as usize;
        let assertion_code = self.code[start_pos_usize..end_pos_usize].to_string();
        let utf16_len = assertion_code.encode_utf16().count();
        let utf8_len = assertion_code.len();
        let contains_multibyte_char = utf16_len < utf8_len;

        self.assertion_metadata = Some(AssertionMetadata {
            ident_name: powered_ident_name.clone(),
            callee_ident_name: prop_ident_name.clone(),
            receiver_ident_name: obj_ident_name.clone(),
            assertion_code,
            assertion_start_pos,
            contains_multibyte_char,
            binary_op: if n.args.len() == 1 {
                match n.args.first().unwrap().expr.as_ref() {
                    Expr::Bin(BinExpr{ op, .. }) => {
                        match op.as_str() {
                            "==" | "===" | "!=" | "!==" => Some(op.as_str().into()),
                            _ => None
                        }
                    },
                    _ => None
                }
            } else {
                None
            }
        });

        // do not enter assertion callee. e.g. assert in assert(foo)
        // n.callee.visit_mut_children_with(self);

        // enter arguments
        for (idx, arg) in n.args.iter_mut().enumerate() {
            if let ExprOrSpread { spread: Some(_), .. } = arg {
                // skip modifying argument if SpreadElement appears immediately beneath assert
                // assert(...args) looks like one argument syntactically, however there are two or more arguments actually.
                // power-assert works at the syntax level so it cannot handle SpreadElement that appears immediately beneath assert.
                return;
            }
            // const _parg1 = _pasrt1.recorder(0);
            let argrec_ident_name = self.next_argrec_variable_name();
            self.argument_metadata = Some(ArgumentMetadata {
                is_captured: false,
                ident_name: argrec_ident_name.clone(),
                arg_index: idx,
                powered_ident_name: powered_ident_name.clone()
            });

            let is_binexp_right_under_the_arg = self.assertion_metadata.is_some() && self.assertion_metadata.as_ref().unwrap().binary_op.is_some();

            // enter argument
            arg.visit_mut_with(self);

            // apply binexp hint to left and right
            if is_binexp_right_under_the_arg {
                self.apply_binexp_hint(arg, &argrec_ident_name);
            }

            // make argument_metadata None
            let arg_meta = self.argument_metadata.take().unwrap();
            if arg_meta.is_captured {
                let replaced_with_rec = self.replace_with_rec_if_tap_exists_directly_under_the_arg(arg, &argrec_ident_name);
                if !replaced_with_rec {
                    self.wrap_with_rec_without_pos(arg, &argrec_ident_name);
                }
                // store argument_metadata to vec for later use
                self.argument_metadata_vec.push(arg_meta);
                is_some_arg_captured = true;
            } else {
                // unset argrec variable name
                // just for compatibility with original power-assert
                self.unset_argrec_variable_name();
            }
        }

        if is_some_arg_captured {
            n.callee = self.replace_callee_with_powered_run(&powered_ident_name);
        }

        // make assertion_metadata None then store it to vec for later use
        self.assertion_metadata_vec.push(self.assertion_metadata.take().unwrap());
    }

}


impl VisitMut for TransformVisitor {
    // Implement necessary visit_mut_* methods for actual custom transform.
    // A comprehensive list of possible visitor methods can be found here:
    // https://rustdoc.swc.rs/swc_ecma_visit/trait.VisitMut.html

    fn visit_mut_program(&mut self, n: &mut Program) {
        // store span as offset at the start of Program node due to SWC issue https://github.com/swc-project/swc/issues/1366
        self.span_offset = n.span_lo().to_u32() - 1;
        n.visit_mut_children_with(self);
    }

    fn visit_mut_module(&mut self, n: &mut Module) {
        // store span as offset at the start of Module node due to SWC issue https://github.com/swc-project/swc/issues/1366
        self.span_offset = n.span_lo().to_u32() - 1;
        n.visit_mut_children_with(self);
    }

    fn visit_mut_import_decl(&mut self, n: &mut ImportDecl) {
        if self.target_modules.contains_key(&n.src.value) {
            for s in &mut n.specifiers {
                match s {
                    ImportSpecifier::Default(ImportDefaultSpecifier { local, .. }) => {
                        self.target_variables.insert(local.to_id());
                    },
                    ImportSpecifier::Namespace(ImportStarAsSpecifier { local, .. }) => {
                        self.target_variables.insert(local.to_id());
                    },
                    ImportSpecifier::Named(ImportNamedSpecifier { local, imported, .. }) => {
                        let module_name = &n.src.value;
                        match imported {
                            Some(imported_name) => {
                                match imported_name {
                                    ModuleExportName::Ident(imported_ident) => {
                                        let allow_list = self.target_modules.get(module_name).unwrap();
                                        if allow_list.is_empty() || allow_list.contains(&imported_ident.sym) {
                                            self.target_variables.insert(local.to_id());
                                        }
                                    },
                                    ModuleExportName::Str(imported_ecma_lit_str) => {
                                        let allow_list = self.target_modules.get(module_name).unwrap();
                                        if allow_list.is_empty() || allow_list.contains(&imported_ecma_lit_str.value) {
                                            self.target_variables.insert(local.to_id());
                                        }
                                    }
                                }
                            },
                            None => {
                                let allow_list = self.target_modules.get(module_name).unwrap();
                                if allow_list.is_empty() || allow_list.contains(&local.sym) {
                                    self.target_variables.insert(local.to_id());
                                }
                            }
                        }
                    }
                }
            }
        }
        n.visit_mut_children_with(self);
    }

    fn visit_mut_module_items(&mut self, n: &mut Vec<ModuleItem>) {
        n.visit_mut_children_with(self);
        if !self.has_declarations_and_imports_to_be_inserted() {
            return;
        }
        let mut new_items: Vec<ModuleItem> = Vec::new();
        new_items.push(self.create_power_assert_runtime_import_decl());
        for assertion_metadata in self.assertion_metadata_vec.iter() {
            new_items.push(ModuleItem::Stmt(self.create_powered_runner_decl(assertion_metadata)));
        }
        for argument_metadata in self.argument_metadata_vec.iter() {
            new_items.push(ModuleItem::Stmt(self.create_argrec_decl(argument_metadata)));
        }
        let end_of_import_position = n.iter().position(|item| {
            !matches!(item, ModuleItem::ModuleDecl(ModuleDecl::Import(_)))
        }).unwrap_or(0);
        let idx = end_of_import_position;
        n.splice(idx..idx, new_items);
        self.clear_transformations();
    }

    fn visit_mut_stmts(&mut self, n: &mut Vec<Stmt>) {
        n.visit_mut_children_with(self);
        if !self.has_declarations_to_be_inserted() {
            return;
        }
        let mut new_items: Vec<Stmt> = Vec::new();
        for assertion_metadata in self.assertion_metadata_vec.iter() {
            new_items.push(self.create_powered_runner_decl(assertion_metadata));
        }
        for argument_metadata in self.argument_metadata_vec.iter() {
            new_items.push(self.create_argrec_decl(argument_metadata));
        }
        n.splice(0..0, new_items);
        self.clear_transformations();
    }

    fn visit_mut_call_expr(&mut self, n: &mut CallExpr) {
        if self.assertion_metadata.is_some() { // callexp inside assertion
            n.visit_mut_children_with(self);
            return;
        }
        // callexp outside assertion
        // if there are no variables that we care about, skip the following transformation logic
        if self.target_variables.is_empty() {
            n.visit_mut_children_with(self);
            return;
        }
        let (prop_name, obj_name): (Option<JsWord>, Option<JsWord>) = match n.callee {
            Callee::Expr(ref mut expr) => {
                match expr.as_mut() {
                    Expr::Member(MemberExpr{ prop: MemberProp::Ident(prop_ident), obj, .. }) => {
                        match obj.as_ref() {
                            Expr::Ident(ref obj_ident) if self.target_variables.contains(&obj_ident.to_id()) => {
                                (Some(prop_ident.sym.clone()), Some(obj_ident.sym.clone()))
                            },
                            // Expr::Member
                            _ => (None, None)
                        }
                    },
                    Expr::Ident(ref ident) if self.target_variables.contains(&ident.to_id()) => {
                        (Some(ident.sym.clone()), None)
                    },
                    _ => (None, None)
                }
            },
            _ => (None, None)
        };
        if let Some(prop_name_value) = prop_name {
            self.capture_assertion(n, prop_name_value, obj_name);
        } else {
            n.visit_mut_children_with(self);
        }
    }

    fn visit_mut_function(&mut self, n: &mut Function) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        // skip function
    }

    fn visit_mut_assign_expr(&mut self, n: &mut AssignExpr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        // skip left side of assignment
        n.right.visit_mut_with(self);
    }

    fn visit_mut_unary_expr(&mut self, n: &mut UnaryExpr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        if n.op == UnaryOp::TypeOf || n.op == UnaryOp::Delete {
            if let Expr::Ident(_) = *n.arg {
                // 'typeof Ident' or 'delete Ident' is not instrumented
                return;
            }
        }
        n.visit_mut_children_with(self);
    }

    fn visit_mut_new_expr(&mut self, n: &mut NewExpr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        self.do_not_capture_immediate_child = true;
        n.visit_mut_children_with(self);
        self.do_not_capture_immediate_child = false;
    }

    fn visit_mut_update_expr(&mut self, n: &mut UpdateExpr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        self.do_not_capture_immediate_child = true;
        n.visit_mut_children_with(self);
        self.do_not_capture_immediate_child = false;
    }

    fn visit_mut_await_expr(&mut self, n: &mut AwaitExpr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        self.do_not_capture_immediate_child = true;
        n.visit_mut_children_with(self);
        self.do_not_capture_immediate_child = false;
    }

    fn visit_mut_callee(&mut self, n: &mut Callee) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        match &n {
            Callee::Expr(callee_expr) => {
                match callee_expr.as_ref() {
                    Expr::Ident(Ident { .. }) => {
                        // do not capture foo in foo()
                    },
                    Expr::Member(MemberExpr{ .. }) => {
                        // do not capture foo.bar in foo.bar() or foo[bar] in foo[bar]()
                        self.do_not_capture_immediate_child = true;
                        n.visit_mut_children_with(self);
                        self.do_not_capture_immediate_child = false;
                    },
                    _ => n.visit_mut_children_with(self)
                }
            },
            _ => {}
        }
    }

    fn visit_mut_expr(&mut self, n: &mut Expr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        match n {
            Expr::Seq(_) | Expr::Paren(_) => {
                n.visit_mut_children_with(self);
                return;
            },
            Expr::Fn(_) => {
                // skip function body
                return;
            },
            _ => {}
        }
        let do_not_capture_current_expr = self.do_not_capture_immediate_child;
        self.do_not_capture_immediate_child = false;
        // calculate expr position before entering children
        let expr_pos = self.calculate_utf16_pos(n);
        // enter children
        n.visit_mut_children_with(self);
        if !do_not_capture_current_expr {
            self.wrap_with_tap(n, &expr_pos);
        }
    }
}

/// An example plugin function with macro support.
/// `plugin_transform` macro interop pointers into deserialized structs, as well
/// as returning ptr back to host.
///
/// It is possible to opt out from macro by writing transform fn manually
/// if plugin need to handle low-level ptr directly via
/// `__transform_plugin_process_impl(
///     ast_ptr: *const u8, ast_ptr_len: i32,
///     unresolved_mark: u32, should_enable_comments_proxy: i32) ->
///     i32 /*  0 for success, fail otherwise.
///             Note this is only for internal pointer interop result,
///             not actual transform result */`
///
/// This requires manual handling of serialization / deserialization from ptrs.
/// Refer swc_plugin_macro to see how does it work internally.
#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    program.fold_with(&mut as_folder(TransformVisitor::from(metadata)))
}


#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use swc_ecma_transforms_testing::test_fixture;
    use swc_core::ecma::transforms::testing::FixtureTestConfig;
    use swc_core::ecma::visit::as_folder;
    use swc_ecma_parser::{EsSyntax, Syntax};
    use std::fs;
    use super::TransformVisitor;

    #[testing::fixture("tests/fixtures/*/fixture.mjs")]
    fn test_with_fixtures(input: PathBuf) {
        let output = input.with_file_name("expected.mjs");
        let code = fs::read_to_string(&input).unwrap();
        test_fixture(
            Syntax::Es(EsSyntax::default()),
            &|_t| {
                as_folder(TransformVisitor::from(&code))
            },
            &input,
            &output,
            FixtureTestConfig {
                allow_error: true,
                ..Default::default()
            },
        );
    }

    #[testing::fixture("tests/fixtures/*/fixture.cond.mjs")]
    fn test_with_fixtures_for_swc(input: PathBuf) {
        let output = input.with_file_name("expected.swc.mjs");
        let code = fs::read_to_string(&input).unwrap();
        test_fixture(
            Syntax::Es(EsSyntax::default()),
            &|_t| {
                as_folder(TransformVisitor::from(&code))
            },
            &input,
            &output,
            FixtureTestConfig {
                allow_error: true,
                ..Default::default()
            },
        );
    }

    #[test]
    fn test_relative_path_to_sandbox_path() {
        let input = "examples/bowling.test.mjs".to_string();
        let cwd = "/Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert".to_string();
        assert_eq!(super::resolve_path_in_sandbox(&input, &cwd), "/cwd/examples/bowling.test.mjs");
    }

    #[test]
    fn test_absolute_path_to_sandbox_path() {
        let input = "/Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert/examples/bowling.test.mjs".to_string();
        let cwd = "/Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert".to_string();
        assert_eq!(super::resolve_path_in_sandbox(&input, &cwd), "/cwd/examples/bowling.test.mjs");
    }

    #[test]
    fn test_file_url_to_sandbox_path() {
        let input = "file:///Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert/examples/bowling.test.mjs".to_string();
        let cwd = "/Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert".to_string();
        assert_eq!(super::resolve_path_in_sandbox(&input, &cwd), "/cwd/examples/bowling.test.mjs");
    }

    #[test]
    fn test_utf16_and_utf8_length() {
        let input = "かxに";
        let mut iter = input.chars();
        let first_char = iter.next().unwrap();
        assert_eq!(first_char.len_utf16(), 1);
        assert_eq!(first_char.len_utf8(), 3);
        let second_char = iter.next().unwrap();
        assert_eq!(second_char.len_utf16(), 1);
        assert_eq!(second_char.len_utf8(), 1);
        let third_char  = iter.next().unwrap();
        assert_eq!(third_char.len_utf16(), 1);
        assert_eq!(third_char.len_utf8(), 3);
    }
}
