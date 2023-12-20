use serde::Deserialize;
use std::collections::HashSet;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::ecma::{
    ast::{
        // op,
        Program,
        Lit,
        Null,
        Str,
        Number,
        Stmt,
        Ident,
        BindingIdent,
        CallExpr,
        BinExpr,
        Expr,
        ExprOrSpread,
        Pat,
        Decl,
        VarDecl,
        VarDeclKind,
        VarDeclarator,
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
        ObjectLit,
        PropOrSpread,
        Prop,
        KeyValueProp,
        PropName,
        Function,
        Callee
    },
    atoms::JsWord,
    visit::{
        as_folder,
        FoldWith,
        VisitMut,
        VisitMutWith
    },
};
use swc_core::common::{
    Span,
    Spanned
};
use swc_core::plugin::plugin_transform;
use swc_core::plugin::metadata::TransformPluginProgramMetadata;
use swc_core::plugin::metadata::TransformPluginMetadataContextKind;

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum Config {
    All(bool),
    WithOptions(Options),
}

#[derive(Clone, Debug, Deserialize)]
pub struct Options {
    #[serde(default)]
    pub modules: Vec<JsWord>,
    #[serde(default)]
    pub variables: Vec<JsWord>,
}

#[derive(Debug)]
struct AssertionMetadata {
    ident_name: JsWord,
    callee_ident_name: JsWord,
    receiver_ident_name: Option<JsWord>,
    assertion_code: String,
    binary_op: Option<String>
}

#[derive(Debug)]
struct ArgumentMetadata {
    is_captured: bool,
    ident_name: JsWord,
    arg_index: usize,
    assertion_start_pos: u32,
    powered_ident_name: JsWord
}

pub struct TransformVisitor {
    powered_var_cnt: usize,
    argrec_var_cnt: usize,
    target_variables: HashSet<JsWord>,
    target_modules: HashMap<JsWord, HashSet<JsWord>>,
    assertion_metadata_vec: Vec<AssertionMetadata>,
    assertion_metadata: Option<AssertionMetadata>,
    argument_metadata_vec: Vec<ArgumentMetadata>,
    argument_metadata: Option<ArgumentMetadata>,
    do_not_capture_immediate_child: bool,
    code: Option<Arc<String>>
}

impl Default for TransformVisitor {
    fn default() -> Self {
        let mut visitor = TransformVisitor {
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: HashSet::new(),
            target_modules: HashMap::new(),
            assertion_metadata_vec: Vec::new(),
            assertion_metadata: None,
            argument_metadata_vec: Vec::new(),
            argument_metadata: None,
            do_not_capture_immediate_child: false,
            code: None
        };
        for module_name in [
            "node:assert",
            "node:assert/strict",
            "assert",
            "assert/strict",
        ].iter() {
            visitor.target_modules.insert(JsWord::from(*module_name), HashSet::new());
        }
        visitor.target_modules.insert(JsWord::from("vitest"), HashSet::from([JsWord::from("assert")]));
        visitor
    }
}

fn resolve_path_in_sandbox(filename: &String, cwd_str: &String) -> String {
    if filename.starts_with("file://") {
        let abs_path_like = filename.replace("file://", "");
        if abs_path_like.starts_with(cwd_str) {
            let relative_path_from_cwd = abs_path_like.replace(cwd_str, "");
            return format!("/cwd{}", relative_path_from_cwd);
        }
    }
    // /cwd is the root of sandbox
    // https://github.com/swc-project/swc/discussions/4997
    let path_in_sandbox = format!("/cwd/{}", filename);
    path_in_sandbox
}

impl From<&String> for TransformVisitor {
    fn from(code: &String) -> Self {
        TransformVisitor {
            code: Some(Arc::new(code.into())),
            .. Default::default()
        }
    }
}

impl From<TransformPluginProgramMetadata> for TransformVisitor {
    fn from(metadata: TransformPluginProgramMetadata) -> Self {
        let config = serde_json::from_str::<Option<Config>>(
            &metadata
                .get_transform_plugin_config()
                .expect("failed to get plugin config for power-assert"),
        );
        println!("config: {:?}", config);

        let code = match metadata.source_map.source_file.get() {
            Some(source_file) => {
                Some(source_file.src.clone())
            },
            None => {
                let filename = metadata
                    .get_context(&TransformPluginMetadataContextKind::Filename)
                    .expect("filename should exist");
                println!("filename: {:?}", filename);

                let cwd = metadata
                    .get_context(&TransformPluginMetadataContextKind::Cwd)
                    .expect("cwd should exist");
                println!("cwd: {:?}", cwd);

                // let env = metadata
                //     .get_context(&TransformPluginMetadataContextKind::Env)
                //     .expect("env should exist");
                // println!("env: {:?}", env);  // "development"

                // /cwd is the root of sandbox
                // https://github.com/swc-project/swc/discussions/4997
                let path_in_sandbox = resolve_path_in_sandbox(&filename, &cwd);
                println!("path_in_sandbox: {:?}", path_in_sandbox);
                // read all file contens into string
                let code = std::fs::read_to_string(path_in_sandbox).expect("failed to read file");
                Some(Arc::new(code))
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

    fn replace_callee_with_powered_run (&self, powered_ident_name: &str) -> Callee {
        Callee::Expr(Box::new(
            Expr::Member(MemberExpr {
                span: Span::default(),
                obj: Box::new(Expr::Ident(Ident::new(powered_ident_name.into(), Span::default()))),
                prop: MemberProp::Ident(Ident::new("run".into(), Span::default()))
            })
        ))
    }

    fn find_and_apply_to_tap(&self, expr: &mut Box<Expr>, argrec_ident_name: &JsWord, f: &dyn Fn(&mut Vec<ExprOrSpread>, &mut Ident)) -> bool {
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

    fn replace_tap_right_under_the_arg_to_rec(&self, arg: &mut ExprOrSpread, argrec_ident_name: &JsWord) -> bool {
        self.find_and_apply_to_tap(&mut arg.expr, argrec_ident_name, &|_args, prop_ident| {
            prop_ident.sym = "rec".into();
        })
    }

    fn create_hint_object(&self, hint: &str) -> Expr {
        Expr::Object(ObjectLit{
            span: Span::default(),
            props: vec![
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(Ident::new("hint".into(), Span::default())),
                    value: Box::new(Expr::Lit(Lit::Str(hint.into())))
                })))
            ]
        })
    }

    fn apply_binexp_hint(&self, arg: &mut ExprOrSpread, argrec_ident_name: &JsWord) {
        self.find_and_apply_to_tap(&mut arg.expr, argrec_ident_name, &|args, _prop_ident| {
            let value = &mut args[0];
            // let mut pos = &args[1];
            if let Expr::Bin(BinExpr { left, right, .. }) = value.expr.as_mut() {
                self.find_and_apply_to_tap(left, argrec_ident_name, &|args, _prop_ident| {
                    args.push(ExprOrSpread::from(Box::new(self.create_hint_object("left"))));
                });
                self.find_and_apply_to_tap(right, argrec_ident_name, &|args, _prop_ident| {
                    args.push(ExprOrSpread::from(Box::new(self.create_hint_object("right"))));
                });
            };
        });
    }

    fn enclose_in_rec_without_pos(&self, arg: &ExprOrSpread, argrec_ident_name: &str) -> Expr {
        Expr::Call(CallExpr {
            span: Span::default(),
            callee: Callee::Expr(Box::new(Expr::Member(
                MemberExpr {
                    span: Span::default(),
                    obj: Box::new(Expr::Ident(Ident::new(argrec_ident_name.into(), Span::default()))),
                    prop: MemberProp::Ident(Ident::new("rec".into(), Span::default()))
                }
            ))),
            args: vec![
                arg.clone()
            ],
            type_args: None,
        })
    }

    fn wrap_with_tap(&mut self, expr: &Expr, pos: &u32) -> Expr {
        let arg_rec = self.argument_metadata.as_mut().unwrap();
        arg_rec.is_captured = true;
        let argrec_ident_name = &arg_rec.ident_name;
        Expr::Call(CallExpr {
            span: Span::default(),
            callee: Callee::Expr(Box::new(Expr::Member(
                MemberExpr {
                    span: Span::default(),
                    obj: Box::new(Expr::Ident(Ident::new(argrec_ident_name.to_owned(), Span::default()))),
                    prop: MemberProp::Ident(Ident::new("tap".into(), Span::default()))
                }
            ))),
            args: vec![
                ExprOrSpread::from(Box::new(expr.clone())),
                ExprOrSpread::from(Box::new(Expr::Lit(Lit::Num(Number::from(*pos as f64)))))
            ],
            type_args: None,
        })
    }

    fn calculate_pos(&self, expr: &Expr) -> u32 {
        let assertion_start_pos = self.argument_metadata.as_ref().unwrap().assertion_start_pos;
        match expr {
            Expr::Member(MemberExpr{ prop, .. }) => {
                match prop {
                    MemberProp::Computed(ComputedPropName{ span, .. }) => span.lo.0 - assertion_start_pos,
                    MemberProp::Ident(Ident { span, .. }) => span.lo.0 - assertion_start_pos,
                    _ => expr.span_lo().0 - assertion_start_pos
                }
            },
            Expr::Call(CallExpr{ callee, .. }) => self.search_pos_for("(", &callee.span()),
            // estree's LogicalExpression is mapped to BinaryExpression in swc
            Expr::Bin(BinExpr{ left, op, ..}) => self.search_pos_for(op.as_str(), &left.span()),
            Expr::Assign(AssignExpr{ left, op, .. }) => self.search_pos_for(op.as_str(), &left.span()),
            Expr::Cond(CondExpr{ test, .. }) => self.search_pos_for("?", &test.span()),
            _ => expr.span_lo().0 - assertion_start_pos
        }
    }

    fn search_pos_for(&self, search_target_str: &str, span: &Span) -> u32 {
        let assertion_start_pos = self.argument_metadata.as_ref().unwrap().assertion_start_pos;
        let search_start_pos = span.hi.0 - assertion_start_pos;
        let code: &String = &self.assertion_metadata.as_ref().unwrap().assertion_code;
        code[search_start_pos as usize..].find(search_target_str).unwrap_or(0) as u32 + search_start_pos
    }

    fn create_argrec_decl(&self, argument_metadata: &ArgumentMetadata) -> Stmt {
        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: Span::default(),
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![
                VarDeclarator {
                    span: Span::default(),
                    name: Pat::Ident(BindingIdent{
                        id: Ident::new(argument_metadata.ident_name.clone(), Span::default()),
                        type_ann: None
                    }),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        span: Span::default(),
                        callee: Callee::Expr(Box::new(Expr::Member(
                            MemberExpr {
                                span: Span::default(),
                                obj: Box::new(Expr::Ident(Ident::new(argument_metadata.powered_ident_name.clone(), Span::default()))),
                                prop: MemberProp::Ident(Ident::new("recorder".into(), Span::default()))
                            }
                        ))),
                        args: vec![
                            ExprOrSpread::from(Box::new(Expr::Lit(Lit::Num(Number::from(argument_metadata.arg_index as f64)))))
                        ],
                        type_args: None,
                    }))),
                    definite: false
                }
            ]
        })))
    }

    fn create_powered_runner_decl(&self, assertion_metadata: &AssertionMetadata) -> Stmt {
        let mut args = vec![
            ExprOrSpread::from(Box::new(
                match &assertion_metadata.receiver_ident_name {
                    Some(receiver_ident_name) => {
                        Expr::Member(
                            MemberExpr {
                                span: Span::default(),
                                obj: Box::new(Expr::Ident(Ident::new(receiver_ident_name.clone(), Span::default()))),
                                prop: MemberProp::Ident(Ident::new(assertion_metadata.callee_ident_name.clone(), Span::default()))
                            }
                        )
                    },
                    None => {
                        Expr::Ident(Ident::new(assertion_metadata.callee_ident_name.clone(), Span::default()))
                    }
                }
            )),
            ExprOrSpread::from(Box::new(
                match &assertion_metadata.receiver_ident_name {
                    Some(receiver_ident_name) => {
                        Expr::Ident(Ident::new(receiver_ident_name.clone(), Span::default()))
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
                span: Span::default(),
                props: vec![
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: PropName::Ident(Ident::new("binexp".into(), Span::default())),
                        value: Box::new(Expr::Lit(Lit::Str(assertion_metadata.binary_op.as_ref().unwrap().clone().into())))
                    })))
                ]
            }))));
        }

        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: Span::default(),
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![
                VarDeclarator {
                    span: Span::default(),
                    name: Pat::Ident(BindingIdent{
                        id: Ident::new(assertion_metadata.ident_name.clone(), Span::default()),
                        type_ann: None
                    }),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        span: Span::default(),
                        callee: Callee::Expr(Box::new(
                            Expr::Ident(Ident::new("_power_".into(), Span::default()))
                        )),
                        args,
                        type_args: None,
                    }))),
                    definite: false
                }
            ]
        })))
    }

    fn create_power_import_decl(&self) -> ModuleItem {
        ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
            span: Span::default(),
            specifiers: vec![
                ImportSpecifier::Named(ImportNamedSpecifier {
                    local: Ident::new("_power_".into(), Span::default()),
                    imported: None,
                    span: Span::default(),
                    is_type_only: false,
                })
            ],
            src: Box::new("@power-assert/runtime".into()),
            type_only: false,
            with: None
        }))
    }

    fn capture_assertion(&mut self, n: &mut CallExpr, prop_ident_name: JsWord, obj_ident_name: Option<JsWord>) {
        let mut is_captured = false;
        let powered_ident_name = self.next_powered_runner_variable_name();
        let assertion_start_pos = n.span.lo.0;

        match self.code {
            Some(ref code) => {
                let start = (n.span.lo.0 - 1) as usize;
                let end = (n.span.hi.0 - 1) as usize;
                let assertion_code = code[start..end].to_string();

                self.assertion_metadata = Some(AssertionMetadata {
                    ident_name: powered_ident_name.clone(),
                    callee_ident_name: prop_ident_name.clone(),
                    receiver_ident_name: obj_ident_name.clone(),
                    assertion_code,
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
            },
            None => {
                // TODO: error handling
                panic!("code is None");
                // return;
            }
        }

        // do not enter callee ident
        // n.callee.visit_mut_children_with(self);

        // enter arguments
        for (idx, arg) in n.args.iter_mut().enumerate() {
            // const _parg1 = _pasrt1.recorder(0);
            let argrec_ident_name = self.next_argrec_variable_name();
            self.argument_metadata = Some(ArgumentMetadata {
                is_captured: false,
                ident_name: argrec_ident_name.clone(),
                arg_index: idx,
                assertion_start_pos,
                powered_ident_name: powered_ident_name.clone()
            });

            // detect left and right of binaryexpression here
            let is_binexp_right_under_the_arg = match arg {
                ExprOrSpread { spread: None, expr } => {
                    match expr.as_ref() {
                        Expr::Bin(BinExpr{ op, .. }) => {
                            matches!(op.as_str(), "==" | "===" | "!=" | "!==")
                        },
                        _ => false
                    }
                },
                _ => false
            };

            // enter argument
            arg.visit_mut_with(self);

            // apply binexp hint to left and right
            if is_binexp_right_under_the_arg {
                self.apply_binexp_hint(arg, &argrec_ident_name);
            }

            let arg_rec = self.argument_metadata.take().unwrap();
            if arg_rec.is_captured {
                // wrap argument with arg_recorder
                let changed = self.replace_tap_right_under_the_arg_to_rec(arg, &argrec_ident_name);
                if !changed {
                    *arg = ExprOrSpread::from(Box::new(self.enclose_in_rec_without_pos(arg, &argrec_ident_name)));
                }
                // make argument_metadata None then store it to vec for later use
                self.argument_metadata_vec.push(arg_rec);
                is_captured = true;
            } else {
                // unset argrec variable name
                // just for compatibility with original power-assert
                self.unset_argrec_variable_name();
            }
        }

        if is_captured {
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

    fn visit_mut_import_decl(&mut self, n: &mut ImportDecl) {
        if self.target_modules.contains_key(&n.src.value) {
            let module_name = &n.src.value;
            for s in &mut n.specifiers {
                match s {
                    ImportSpecifier::Default(ImportDefaultSpecifier { local, .. }) => {
                        self.target_variables.insert(local.sym.clone());
                    },
                    ImportSpecifier::Namespace(ImportStarAsSpecifier { local, .. }) => {
                        self.target_variables.insert(local.sym.clone());
                    },
                    ImportSpecifier::Named(ImportNamedSpecifier { local, imported, .. }) => {
                        match imported {
                            Some(imported_name) => {
                                match imported_name {
                                    ModuleExportName::Ident(imported_ident) => {
                                        let allow_list = self.target_modules.get(module_name).unwrap();
                                        if allow_list.is_empty() || allow_list.contains(&imported_ident.sym) {
                                            self.target_variables.insert(local.sym.clone());
                                        }
                                    },
                                    ModuleExportName::Str(_imported_ecma_lit_str) => {
                                        let allow_list = self.target_modules.get(module_name).unwrap();
                                        if allow_list.is_empty() || allow_list.contains(&_imported_ecma_lit_str.value) {
                                            self.target_variables.insert(local.sym.clone());
                                        }
                                    }
                                }
                            },
                            None => {
                                let allow_list = self.target_modules.get(module_name).unwrap();
                                if allow_list.is_empty() || allow_list.contains(&local.sym) {
                                    self.target_variables.insert(local.sym.clone());
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
        let mut new_items: Vec<ModuleItem> = Vec::new();
        new_items.push(self.create_power_import_decl());
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

    fn visit_mut_stmts(&mut self, stmts: &mut Vec<Stmt>) {
        stmts.visit_mut_children_with(self);
        let mut new_items: Vec<Stmt> = Vec::new();
        for assertion_metadata in self.assertion_metadata_vec.iter() {
            new_items.push(self.create_powered_runner_decl(assertion_metadata));
        }
        for argument_metadata in self.argument_metadata_vec.iter() {
            new_items.push(self.create_argrec_decl(argument_metadata));
        }
        stmts.splice(0..0, new_items);
        self.clear_transformations();
    }

    fn visit_mut_call_expr(&mut self, n: &mut CallExpr) {
        if self.assertion_metadata.is_some() { // callexp inside assertion
            n.visit_mut_children_with(self);
            return;
        }
        // callexp outside assertion
        let (prop_name, obj_name): (Option<JsWord>, Option<JsWord>) = match n.callee {
            Callee::Expr(ref mut expr) => {
                match expr.as_mut() {
                    Expr::Member(MemberExpr{ prop: MemberProp::Ident(prop_ident), obj, .. }) => {
                        match obj.as_ref() {
                            Expr::Ident(ref obj_ident) if self.target_variables.contains(&obj_ident.sym) => {
                                (Some(prop_ident.sym.clone()), Some(obj_ident.sym.clone()))
                            },
                            // Expr::Member
                            _ => (None, None)
                        }
                    },
                    Expr::Ident(ref ident) if self.target_variables.contains(&ident.sym) => {
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
        self.do_not_capture_immediate_child = true;
        n.visit_mut_children_with(self);
        self.do_not_capture_immediate_child = false;
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
        // println!("############ enter expr: {:?}", n);
        let do_not_capture_current_expr = self.do_not_capture_immediate_child;
        self.do_not_capture_immediate_child = false;
        // save expr position here
        let expr_pos = self.calculate_pos(n);
        n.visit_mut_children_with(self);
        if do_not_capture_current_expr {
            return;
        }
        *n = self.wrap_with_tap(n, &expr_pos);
        // println!("############ leave expr: {:?}", n);
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
    use swc_ecma_parser::{EsConfig, Syntax};
    use std::fs;
    use super::TransformVisitor;

    #[testing::fixture("tests/fixtures/*/fixture.mjs")]
    fn test_with_fixtures(input: PathBuf) {
        let output = input.with_file_name("expected.mjs");
        let code = fs::read_to_string(&input).unwrap();
        test_fixture(
            Syntax::Es(EsConfig::default()),
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
    fn test_relative_path() {
        let input = "examples/bowling.test.mjs".to_string();
        let cwd = "/Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert".to_string();
        assert_eq!(super::resolve_path_in_sandbox(&input, &cwd), "/cwd/examples/bowling.test.mjs");
    }

    #[test]
    fn test_absolute_url() {
        let input = "file:///Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert/examples/truth.test.mts".to_string();
        let cwd = "/Users/takuto/src/github.com/twada/power-assert-monorepo/packages/swc-plugin-power-assert".to_string();
        assert_eq!(super::resolve_path_in_sandbox(&input, &cwd), "/cwd/examples/truth.test.mts");
    }
}
