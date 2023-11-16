use std::path::Path;
use serde::Deserialize;
use std::path::PathBuf;
use std::collections::HashSet;
use std::sync::Arc;
use swc_core::ecma::{
    ast::{
        // op,
        Program,
        Lit,
        Null,
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
        CondExpr,
        ObjectLit,
        PropOrSpread,
        Prop,
        KeyValueProp,
        PropName,
        Callee
    },
    atoms::JsWord,
    visit::{as_folder, FoldWith, VisitMut, VisitMutWith},
};
use swc_core::common::{
    FileName,
    Span,
    Spanned
};
use swc_core::plugin::plugin_transform;
use swc_core::plugin::metadata::TransformPluginProgramMetadata;
use swc_core::plugin::metadata::TransformPluginMetadataContextKind;
// use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};
// use swc_common::{plugin::metadata::TransformPluginMetadataContextKind, SourceMapper, Spanned};
// // pub mod metadata {
// //     pub use swc_common::plugin::metadata::TransformPluginMetadataContextKind;
// //     pub use swc_plugin_proxy::TransformPluginProgramMetadata;
// // }



#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum Config {
    All(bool),
    WithOptions(Options),
}

impl Config {
    pub fn truthy(&self) -> bool {
        match self {
            Config::All(b) => *b,
            Config::WithOptions(_) => true,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct Options {
    #[serde(default)]
    pub exclude: Vec<JsWord>,
}

struct AssertionMetadata {
    ident_name: String,
    callee_ident_name: String,
    receiver_ident_name: Option<String>,
    assertion_code: String,
    binary_op: Option<String>
}

struct ArgumentMetadata {
    ident_name: String,
    arg_index: usize,
    assertion_start_pos: u32,
    powered_ident_name: String,
    binary_op: Option<String>
}

// enum Metadata {
//     Assertion(AssertionMetadata),
//     Argument(ArgumentMetadata)
// }

pub struct TransformVisitor {
    is_captured: bool,
    powered_var_cnt: usize,
    argrec_var_cnt: usize,
    target_variables: HashSet<JsWord>,
    assertion_metadata_vec: Vec<AssertionMetadata>,
    assertion_metadata: Option<AssertionMetadata>,
    argument_metadata_vec: Vec<ArgumentMetadata>,
    argument_metadata: Option<ArgumentMetadata>,
    // metadata_vec: Vec<Metadata>,
    code: Option<Arc<String>>
}

impl TransformVisitor {
    pub fn new() -> TransformVisitor {
        TransformVisitor {
            is_captured: false,
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: HashSet::new(),
            assertion_metadata_vec: Vec::new(),
            assertion_metadata: None,
            argument_metadata_vec: Vec::new(),
            argument_metadata: None,
            // metadata_vec: Vec::new(),
            code: None
        }
    }

    pub fn new_with_code(code: &String) -> TransformVisitor {
        TransformVisitor {
            is_captured: false,
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: HashSet::new(),
            assertion_metadata_vec: Vec::new(),
            assertion_metadata: None,
            argument_metadata_vec: Vec::new(),
            argument_metadata: None,
            // metadata_vec: Vec::new(),
            code: Some(Arc::new(code.into()))
        }
    }

    pub fn new_with_metadata(metadata: TransformPluginProgramMetadata) -> TransformVisitor {
        // let filename = if let Some(filename) = metadata.get_context(&TransformPluginMetadataContextKind::Filename)
        //     {
        //         FileName::Real(PathBuf::from(filename))
        //     } else {
        //         FileName::Anon
        //     };
        // println!("filename: {:?}", filename);

        // let file_name = metadata
        //     .get_context(&TransformPluginMetadataContextKind::Filename)
        //     .unwrap();
        // println!("file_name: {:?}", file_name);
        // let path = Path::new(&file_name);
        // let source_map = std::sync::Arc::new(metadata.source_map);
        // println!("path: {:?}", path);
        // println!("source_map: {:?}", source_map);

        // println!("metadata: {:?}", metadata);
        // println!("metadata: {:?}", metadata.source_map);
        // let code = None;
        let code = match metadata.source_map.source_file.get() {
            Some(source_file) => {
                Some(source_file.src.clone())
            },
            None => {
                panic!("source_file is None")
                // None
                // let file_name = metadata
                //     .get_context(&TransformPluginMetadataContextKind::Filename)
                //     .expect("filename should exist");
                // println!("file_name: {:?}", file_name);
                //  panic!("source_file is None")
            }
        };
        TransformVisitor {
            is_captured: false,
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: HashSet::new(),
            assertion_metadata_vec: Vec::new(),
            assertion_metadata: None,
            argument_metadata_vec: Vec::new(),
            argument_metadata: None,
            // metadata_vec: Vec::new(),
            code
        }
    }

    fn next_powered_runner_variable_name(&mut self) -> String {
        self.powered_var_cnt += 1;
        format!("_pasrt{}", self.powered_var_cnt)
    }

    fn next_argrec_variable_name(&mut self) -> String {
        self.argrec_var_cnt += 1;
        format!("_parg{}", self.argrec_var_cnt)
    }

    fn clear_transformations(&mut self) {
        self.assertion_metadata_vec.clear();
        self.argument_metadata_vec.clear();
        // self.metadata_vec.clear();
    }

    fn replace_callee_with_powered_run (&self, powered_ident_name: &String) -> Callee {
        Callee::Expr(Box::new(
            Expr::Member(MemberExpr {
                span: Span::default(),
                obj: Box::new(Expr::Ident(Ident::new(powered_ident_name.clone().into(), Span::default()))),
                prop: MemberProp::Ident(Ident::new("run".into(), Span::default()))
            })
        ))
    }

    fn replace_tap_right_under_the_arg_to_rec(&self, arg: &mut ExprOrSpread, argrec_ident_name: &String) -> bool {
        match arg.expr.as_mut() {
            Expr::Call(CallExpr { callee: Callee::Expr(callee), .. }) => {
                match callee.as_mut() {
                    Expr::Member(MemberExpr { obj, prop, .. }) => {
                        match obj.as_ref() {
                            Expr::Ident(ident) => {
                                if ident.sym == *argrec_ident_name {
                                    if let MemberProp::Ident(prop_ident) = prop {
                                        if prop_ident.sym == "tap" {
                                            *prop_ident = Ident::new("rec".into(), Span::default());
                                            return true;
                                        }
                                    }
                                }
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

    fn apply_hint_right_left(&self, expr: &mut Box<Expr>, argrec_ident_name: &String, hint: &str) {
        match expr.as_mut() {
            Expr::Call(CallExpr { callee: Callee::Expr(callee), args, .. }) => {
                match callee.as_mut() {
                    Expr::Member(MemberExpr { obj, prop, .. }) => {
                        match obj.as_ref() {
                            Expr::Ident(ident) => {
                                if ident.sym == *argrec_ident_name {
                                    if let MemberProp::Ident(prop_ident) = prop {
                                        if prop_ident.sym == "tap" {
                                            args.push(ExprOrSpread {
                                                spread: None,
                                                expr: Box::new(Expr::Object(ObjectLit{
                                                    span: Span::default(),
                                                    props: vec![
                                                        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                                            key: PropName::Ident(Ident::new("hint".into(), Span::default())),
                                                            value: Box::new(Expr::Lit(Lit::Str(hint.into())))
                                                        })))
                                                    ]
                                                }))
                                            });
                                        }
                                    }
                                }
                            },
                            _ => {}
                        }
                    },
                    _ => {}
                }
            },
            _ => {}
        }
    }

    fn apply_binexp_hint(&self, arg: &mut ExprOrSpread, argrec_ident_name: &String) {
        match arg.expr.as_mut() {
            Expr::Call(CallExpr { callee: Callee::Expr(callee), args, .. }) => {
                match callee.as_mut() {
                    Expr::Member(MemberExpr { obj, prop, .. }) => {
                        match obj.as_ref() {
                            Expr::Ident(ident) => {
                                if ident.sym == *argrec_ident_name {
                                    if let MemberProp::Ident(prop_ident) = prop {
                                        if prop_ident.sym == "tap" {
                                            let value = &mut args[0];
                                            // let mut pos = &args[1];
                                            match value.expr.as_mut() {
                                                Expr::Bin(BinExpr { left, right, .. }) => {
                                                    self.apply_hint_right_left(left, argrec_ident_name, "left".into());
                                                    self.apply_hint_right_left(right, argrec_ident_name, "right".into());
                                                },
                                                _ => {}
                                            }
                                        }
                                    }
                                }
                            },
                            _ => {}
                        }
                    },
                    _ => {}
                }
            },
            _ => {}
        }
    }

    fn enclose_in_rec_without_pos(&self, arg: &mut ExprOrSpread, argrec_ident_name: &String) -> Expr {
        Expr::Call(CallExpr {
            span: Span::default(),
            callee: Callee::Expr(Box::new(Expr::Member(
                MemberExpr {
                    span: Span::default(),
                    obj: Box::new(Expr::Ident(Ident::new(argrec_ident_name.clone().into(), Span::default()))),
                    prop: MemberProp::Ident(Ident::new("rec".into(), Span::default()))
                }
            ))),
            args: vec![
                arg.clone()
            ],
            type_args: None,
        })
    }

    fn wrap_with_tap(&self, expr: &Expr, argrec_ident_name: &String, pos: &u32) -> Expr {
        Expr::Call(CallExpr {
            span: Span::default(),
            callee: Callee::Expr(Box::new(Expr::Member(
                MemberExpr {
                    span: Span::default(),
                    obj: Box::new(Expr::Ident(Ident::new(argrec_ident_name.clone().into(), Span::default()))),
                    prop: MemberProp::Ident(Ident::new("tap".into(), Span::default()))
                }
            ))),
            args: vec![
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(expr.clone()),
                },
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Lit(Lit::Num(Number {
                        span: Span::default(),
                        value: *pos as f64,
                        raw: None
                    })))
                }
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
        let found_pos = code[search_start_pos as usize..].find(search_target_str).unwrap_or(0) as u32 + search_start_pos;
        found_pos
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
                        id: Ident::new(argument_metadata.ident_name.clone().into(), Span::default()),
                        type_ann: None
                    }),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        span: Span::default(),
                        callee: Callee::Expr(Box::new(Expr::Member(
                            MemberExpr {
                                span: Span::default(),
                                obj: Box::new(Expr::Ident(Ident::new(argument_metadata.powered_ident_name.clone().into(), Span::default()))),
                                prop: MemberProp::Ident(Ident::new("recorder".into(), Span::default()))
                            }
                        ))),
                        args: vec![
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Lit(Lit::Num(Number {
                                    span: Span::default(),
                                    value: argument_metadata.arg_index as f64,
                                    raw: None
                                })))
                            }
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
            ExprOrSpread {
                spread: None,
                expr: Box::new(
                    match &assertion_metadata.receiver_ident_name {
                        Some(receiver_ident_name) => {
                            Expr::Member(
                                MemberExpr {
                                    span: Span::default(),
                                    obj: Box::new(Expr::Ident(Ident::new(receiver_ident_name.clone().into(), Span::default()))),
                                    prop: MemberProp::Ident(Ident::new(assertion_metadata.callee_ident_name.clone().into(), Span::default()))
                                }
                            )
                        },
                        None => {
                            Expr::Ident(Ident::new(assertion_metadata.callee_ident_name.clone().into(), Span::default()))
                        }
                    }
                )
            },
            ExprOrSpread {
                spread: None,
                expr: Box::new(
                    match &assertion_metadata.receiver_ident_name {
                        Some(receiver_ident_name) => {
                            Expr::Ident(Ident::new(receiver_ident_name.clone().into(), Span::default()))
                        },
                        None => {
                            Expr::Lit(Lit::Null(Null { span: Span::default() }))
                        }
                    }
                )
            },
            ExprOrSpread {
                spread: None,
                expr: Box::new(Expr::Lit(Lit::Str(assertion_metadata.assertion_code.clone().into())))
            }
        ];

        if assertion_metadata.binary_op.is_some() {
            // add object expression { binexp: "===" } to args
            args.push(ExprOrSpread {
                spread: None,
                expr: Box::new(Expr::Object(ObjectLit{
                    span: Span::default(),
                    props: vec![
                        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                            key: PropName::Ident(Ident::new("binexp".into(), Span::default())),
                            value: Box::new(Expr::Lit(Lit::Str(assertion_metadata.binary_op.as_ref().unwrap().clone().into())))
                        })))
                    ]
                }))
            });
        }

        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: Span::default(),
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![
                VarDeclarator {
                    span: Span::default(),
                    name: Pat::Ident(BindingIdent{
                        id: Ident::new(assertion_metadata.ident_name.clone().into(), Span::default()),
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

    fn capture_assertion(&mut self, n: &mut CallExpr, prop_ident_name: String, obj_ident_name: Option<String>) {
        self.is_captured = false;
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
                    receiver_ident_name: obj_ident_name,
                    assertion_code: assertion_code,
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
                ident_name: argrec_ident_name.clone(),
                arg_index: idx,
                assertion_start_pos,
                powered_ident_name: powered_ident_name.clone(),
                binary_op: match arg.expr.as_ref() {
                    Expr::Bin(BinExpr{ op, .. }) => {
                        match op.as_str() {
                            "==" | "===" | "!=" | "!==" => Some(op.as_str().into()),
                            _ => None
                        }
                    },
                    _ => None
                }
            });

            // detect left and right of binaryexpression here
            let is_binexp_right_under_the_arg = match arg {
                ExprOrSpread { spread: None, expr } => {
                    match expr.as_ref() {
                        Expr::Bin(BinExpr{ op, .. }) => {
                            match op.as_str() {
                                "==" | "===" | "!=" | "!==" => true,
                                _ => false
                            }
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

            // wrap argument with arg_recorder
            let changed = self.replace_tap_right_under_the_arg_to_rec(arg, &argrec_ident_name);
            if !changed {
                *arg = ExprOrSpread {
                    spread: None,
                    expr: Box::new(self.enclose_in_rec_without_pos(arg, &argrec_ident_name))
                };
            }

            // make argument_metadata None then store it to vec for later use
            self.argument_metadata_vec.push(self.argument_metadata.take().unwrap());
            // self.metadata_vec.push(Metadata::Argument(self.argument_metadata.take().unwrap()));
        }

        //TODO: if is_captured {
        n.callee = self.replace_callee_with_powered_run(&powered_ident_name);

        // make assertion_metadata None then store it to vec for later use
        self.assertion_metadata_vec.push(self.assertion_metadata.take().unwrap());
        // self.metadata_vec.push(Metadata::Assertion(self.assertion_metadata.take().unwrap()));

        self.is_captured = false;
    }


}


impl VisitMut for TransformVisitor {
    // Implement necessary visit_mut_* methods for actual custom transform.
    // A comprehensive list of possible visitor methods can be found here:
    // https://rustdoc.swc.rs/swc_ecma_visit/trait.VisitMut.html

    fn visit_mut_import_decl(&mut self, n: &mut ImportDecl) {
        if n.src.value == "node:assert" {
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
                                    ModuleExportName::Ident(_ident) => {
                                        // self.target_variables.insert(ident.sym.clone());
                                        self.target_variables.insert(local.sym.clone());
                                    },
                                    ModuleExportName::Str(_ecma_lit_str) => {
                                        // self.target_variables.insert(ecma_lit_str.value.clone());
                                        self.target_variables.insert(local.sym.clone());
                                    }
                                }
                            },
                            None => {
                                self.target_variables.insert(local.sym.clone());
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
        // for metadata in self.metadata_vec.iter() {
        //     match metadata {
        //         Metadata::Assertion(assertion_metadata) => {
        //             new_items.push(ModuleItem::Stmt(self.create_powered_runner_decl(assertion_metadata)));
        //         },
        //         Metadata::Argument(argument_metadata) => {
        //             new_items.push(ModuleItem::Stmt(self.create_argrec_decl(argument_metadata)));
        //         }
        //     }
        // }
        for assertion_metadata in self.assertion_metadata_vec.iter() {
            new_items.push(ModuleItem::Stmt(self.create_powered_runner_decl(assertion_metadata)));
        }
        for argument_metadata in self.argument_metadata_vec.iter() {
            new_items.push(ModuleItem::Stmt(self.create_argrec_decl(argument_metadata)));
        }
        let end_of_import_position = n.iter().position(|item| {
            match item {
                ModuleItem::ModuleDecl(ModuleDecl::Import(_)) => false,
                _ => true
            }
        }).unwrap_or(0);
        let idx = end_of_import_position;
        n.splice(idx..idx, new_items);
        self.clear_transformations();
    }

    fn visit_mut_stmts(&mut self, stmts: &mut Vec<Stmt>) {
        stmts.visit_mut_children_with(self);
        let mut new_items: Vec<Stmt> = Vec::new();
        // for metadata in self.metadata_vec.iter() {
        //     match metadata {
        //         Metadata::Assertion(assertion_metadata) => {
        //             new_items.push(self.create_powered_runner_decl(assertion_metadata));
        //         },
        //         Metadata::Argument(argument_metadata) => {
        //             new_items.push(self.create_argrec_decl(argument_metadata));
        //         }
        //     }
        // }
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
        let mut prop_name: Option<String> = None;
        let mut obj_name: Option<String> = None;
        match n.callee {
            Callee::Expr(ref mut expr) => {
                match expr.as_mut() {
                    Expr::Member(MemberExpr{ prop, obj, .. }) => {
                        match prop {
                            MemberProp::Ident(prop_ident) => {
                                if self.assertion_metadata.is_some() { // callexp inside assertion
                                    // memo: do not visit and wrap prop if prop is Ident
                                    obj.visit_mut_with(self);
                                    for arg in n.args.iter_mut() {
                                        arg.visit_mut_with(self);
                                    }
                                } else { // callexp outside assertion
                                    match obj.as_ref() {
                                        Expr::Ident(ref obj_ident) => {
                                            if self.target_variables.contains(&obj_ident.sym) {
                                                prop_name = Some(prop_ident.sym.to_string());
                                                obj_name = Some(obj_ident.sym.to_string());
                                            }
                                        },
                                        _ => {
                                            n.visit_mut_children_with(self);
                                        }
                                    }
                                }
                            },
                            _ => {
                                n.visit_mut_children_with(self);
                            }
                        }
                    },
                    Expr::Ident(ref ident) => {
                        if self.assertion_metadata.is_some() { // callexp inside assertion
                            // memo: do not wrap callee if callee is Ident
                            for arg in n.args.iter_mut() {
                                arg.visit_mut_with(self);
                            }
                        } else { // callexp outside assertion
                            if self.target_variables.contains(&ident.sym) {
                                prop_name = Some(ident.sym.to_string());
                            } else {
                                n.visit_mut_children_with(self);
                            }
                        }
                    },
                    _ => {
                        n.visit_mut_children_with(self);
                    }
                }
            },
            _ => {
                n.visit_mut_children_with(self);
            }
        }
        if prop_name.is_some() {
            self.capture_assertion(n, prop_name.unwrap(), obj_name);
        }
    }

    fn visit_mut_assign_expr(&mut self, n: &mut AssignExpr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        // skip left side of assignment
        n.right.visit_mut_with(self);
    }

    fn visit_mut_expr(&mut self, n: &mut Expr) {
        if self.argument_metadata.is_none() {
            n.visit_mut_children_with(self);
            return;
        }
        // println!("############ enter expr: {:?}", n);
        // save expr position here
        let expr_pos = self.calculate_pos(&n);
        n.visit_mut_children_with(self);
        let arg_rec = self.argument_metadata.as_ref().unwrap();
        match n {
            Expr::Seq(_) => {
                // do not capture sequence expression itself
            },
            Expr::Paren(_) => {
                // do not capture parenthesized expression itself
            },
            _ => {
                *n = self.wrap_with_tap(n, &arg_rec.ident_name, &expr_pos);
            }
        }
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
    let config = serde_json::from_str::<Option<Config>>(
        &metadata
            .get_transform_plugin_config()
            .expect("failed to get plugin config for remove-console"),
    );
    println!("config: {:?}", config);

    let file_name = metadata
        .get_context(&TransformPluginMetadataContextKind::Filename)
        .expect("filename should exist");
    println!("file_name: {:?}", file_name);

    // let filename = if let Some(filename) = metadata.get_context(&TransformPluginMetadataContextKind::Filename)
    // {
    //     FileName::Real(PathBuf::from(filename))
    // } else {
    //     FileName::Anon
    // };
    // println!("filename: {:?}", filename);

    // let path = Path::new(&file_name);
    // println!("path: {:?}", path);

    // https://github.com/swc-project/swc/discussions/4997
    let path_in_sandbox = format!("/cwd/{}", file_name);

    println!("path_in_sandbox: {:?}", path_in_sandbox);

    // read all file contens into string
    let code = std::fs::read_to_string(path_in_sandbox).expect("failed to read file");

    // let code = match metadata.source_map.source_file.get() {
    //     Some(source_file) => {
    //         panic!("################ test2 ################");
    //         Some(source_file.src.clone())
    //     },
    //     None => {
    //         panic!("################ test3 ################");
    //         panic!("source_file is None")
    //         // None
    //         //  panic!("source_file is None")
    //     }
    // };
    // panic!("################ test4 ################");

    let visitor = TransformVisitor::new_with_code(&code);
    // panic!("################ test5 ################");

    program.fold_with(&mut as_folder(visitor))
    // program.fold_with(&mut as_folder(TransformVisitor::new_with_metadata(metadata)))
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
                as_folder(TransformVisitor::new_with_code(&code))
            },
            &input,
            &output,
            FixtureTestConfig {
                allow_error: true,
                ..Default::default()
            },
        );
    }
}
