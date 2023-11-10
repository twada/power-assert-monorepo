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
        Callee
    },
    atoms::JsWord,
    visit::{as_folder, FoldWith, VisitMut, VisitMutWith},
};
use swc_core::common::{
    Span,
    Spanned
};
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

struct DecoratorMetadata {
    ident_name: String,
    callee_ident_name: String,
    receiver_ident_name: Option<String>,
    assertion_code: String
}

struct ArgRecorderMetadata {
    ident_name: String,
    arg_index: usize,
    assertion_start_pos: u32,
    powered_ident_name: String
}

pub struct TransformVisitor {
    is_capturing: bool,
    is_captured: bool,
    powered_var_cnt: usize,
    argrec_var_cnt: usize,
    target_variables: HashSet<JsWord>,
    decorator_metadata_vec: Vec<DecoratorMetadata>,
    argrec_metadata_vec: Vec<ArgRecorderMetadata>,
    arg_recorder: Option<ArgRecorderMetadata>,
    code: Option<Arc<String>>
}

impl TransformVisitor {
    pub fn new() -> TransformVisitor {
        TransformVisitor {
            is_capturing: false,
            is_captured: false,
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: HashSet::new(),
            decorator_metadata_vec: Vec::new(),
            argrec_metadata_vec: Vec::new(),
            arg_recorder: None,
            code: None
        }
    }

    pub fn new_with_code(code: &String) -> TransformVisitor {
        TransformVisitor {
            is_capturing: false,
            is_captured: false,
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: HashSet::new(),
            decorator_metadata_vec: Vec::new(),
            argrec_metadata_vec: Vec::new(),
            arg_recorder: None,
            code: Some(Arc::new(code.into()))
        }
    }

    pub fn new_with_metadata(metadata: &TransformPluginProgramMetadata) -> TransformVisitor {
        let code = match metadata.source_map.source_file.get() {
            Some(source_file) => {
                Some(source_file.src.clone())
            },
            None => None
        };
        TransformVisitor {
            is_capturing: false,
            is_captured: false,
            powered_var_cnt: 0,
            argrec_var_cnt: 0,
            target_variables: HashSet::new(),
            decorator_metadata_vec: Vec::new(),
            argrec_metadata_vec: Vec::new(),
            arg_recorder: None,
            code
        }
    }

    fn next_powered_variable_name(&mut self) -> String {
        self.powered_var_cnt += 1;
        format!("_pasrt{}", self.powered_var_cnt)
    }

    fn next_argrec_variable_name(&mut self) -> String {
        self.argrec_var_cnt += 1;
        format!("_parg{}", self.argrec_var_cnt)
    }

    fn clear_transformations(&mut self) {
        self.decorator_metadata_vec.clear();
        self.argrec_metadata_vec.clear();
    }

    fn replace_calee_with_powered_run (&mut self, powered_ident_name: &String) -> Callee {
        Callee::Expr(Box::new(
            Expr::Member(MemberExpr {
                span: Span::default(),
                obj: Box::new(Expr::Ident(Ident::new(powered_ident_name.clone().into(), Span::default()))),
                prop: MemberProp::Ident(Ident::new("run".into(), Span::default()))
            })
        ))
    }

    fn enclose_in_rec (&mut self, arg: &ExprOrSpread, argrec_ident_name: &String, arg_pos: &u32) -> Expr {
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
                arg.clone(),
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Lit(Lit::Num(Number {
                        span: Span::default(),
                        value: *arg_pos as f64,
                        raw: None
                    })))
                }
            ],
            type_args: None,
        })
    }

    fn enclose_in_tap (&mut self, expr: &Expr) -> Expr {
        let arg_recorder = self.arg_recorder.as_ref().unwrap();
        let arg_pos = expr.span_lo().0 - arg_recorder.assertion_start_pos;
        Expr::Call(CallExpr {
            span: Span::default(),
            callee: Callee::Expr(Box::new(Expr::Member(
                MemberExpr {
                    span: Span::default(),
                    obj: Box::new(Expr::Ident(Ident::new(arg_recorder.ident_name.clone().into(), Span::default()))),
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
                        value: arg_pos.into(),
                        raw: None
                    })))
                }
            ],
            type_args: None,
        })
    }

    fn create_argrec_decl(&self, argrec: &ArgRecorderMetadata) -> Stmt {
        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: Span::default(),
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![
                VarDeclarator {
                    span: Span::default(),
                    name: Pat::Ident(BindingIdent{
                        id: Ident::new(argrec.ident_name.clone().into(), Span::default()),
                        type_ann: None
                    }),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        span: Span::default(),
                        callee: Callee::Expr(Box::new(Expr::Member(
                            MemberExpr {
                                span: Span::default(),
                                obj: Box::new(Expr::Ident(Ident::new(argrec.powered_ident_name.clone().into(), Span::default()))),
                                prop: MemberProp::Ident(Ident::new("recorder".into(), Span::default()))
                            }
                        ))),
                        args: vec![
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Lit(Lit::Num(Number {
                                    span: Span::default(),
                                    value: argrec.arg_index as f64,
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

    fn create_decorator_decl(&self, decorator_metadata: &DecoratorMetadata) -> Stmt {
        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: Span::default(),
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![
                VarDeclarator {
                    span: Span::default(),
                    name: Pat::Ident(BindingIdent{
                        id: Ident::new(decorator_metadata.ident_name.clone().into(), Span::default()),
                        type_ann: None
                    }),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        span: Span::default(),
                        callee: Callee::Expr(Box::new(
                            Expr::Ident(Ident::new("_power_".into(), Span::default()))
                        )),
                        args: vec![
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Ident(Ident::new(decorator_metadata.callee_ident_name.clone().into(), Span::default())))
                            },
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(
                                    match &decorator_metadata.receiver_ident_name {
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
                                expr: Box::new(Expr::Lit(Lit::Str(decorator_metadata.assertion_code.clone().into())))
                            }
                        ],
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
        for decorator in self.decorator_metadata_vec.iter() {
            new_items.push(ModuleItem::Stmt(self.create_decorator_decl(decorator)));
        }
        for argrec in self.argrec_metadata_vec.iter() {
            new_items.push(ModuleItem::Stmt(self.create_argrec_decl(argrec)));
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
        for decorator in self.decorator_metadata_vec.iter() {
            new_items.push(self.create_decorator_decl(decorator));
        }
        for argrec in self.argrec_metadata_vec.iter() {
            new_items.push(self.create_argrec_decl(argrec));
        }
        stmts.splice(0..0, new_items);
        self.clear_transformations();
    }

    fn visit_mut_call_expr(&mut self, n: &mut CallExpr) {
        match n.callee {
            Callee::Expr(ref expr) => {
                match expr.as_ref() {
                    Expr::Ident(ref ident) => {
                        if self.is_capturing {
                            n.visit_mut_children_with(self);
                        } else if self.target_variables.contains(&ident.sym) {
                            self.is_capturing = true;
                            self.is_captured = false;
                            let powered_ident_name = self.next_powered_variable_name();
                            let assertion_start_pos = n.span_lo().0;

                            match self.code {
                                Some(ref code) => {
                                    let start = (n.span.lo.0 - 1) as usize;
                                    let end = (n.span.hi.0 - 1) as usize;
                                    let assertion_code = code[start..end].to_string();

                                    self.decorator_metadata_vec.push(DecoratorMetadata {
                                        ident_name: powered_ident_name.clone(),
                                        callee_ident_name: ident.sym.to_string(),
                                        receiver_ident_name: None,
                                        assertion_code: assertion_code
                                    });
                                },
                                None => {
                                    // TODO: error handling
                                }
                            }

                            // enter callee
                            n.callee.visit_mut_children_with(self);

                            // then enter arguments
                            for (idx, arg) in n.args.iter_mut().enumerate() {
                                // const _parg1 = _pasrt1.recorder(0);
                                let argrec_ident_name = self.next_argrec_variable_name();
                                let arg_pos = arg.span_lo().0 - assertion_start_pos;
                                self.arg_recorder = Some(ArgRecorderMetadata {
                                    ident_name: argrec_ident_name.clone(),
                                    arg_index: idx,
                                    assertion_start_pos,
                                    powered_ident_name: powered_ident_name.clone()
                                });

                                // enter argument
                                arg.visit_mut_children_with(self);

                                // wrap argument with arg_recorder
                                *arg = ExprOrSpread {
                                    spread: None,
                                    expr: Box::new(self.enclose_in_rec(&arg, &argrec_ident_name, &arg_pos))
                                };

                                // make arg_recorder None then store it to vec for later use
                                self.argrec_metadata_vec.push(self.arg_recorder.take().unwrap());
                            }

                            //TODO: if is_captured {
                            n.callee = self.replace_calee_with_powered_run(&powered_ident_name);

                            self.is_capturing = false;
                            self.is_captured = false;
                        } else {
                            n.visit_mut_children_with(self);
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
    }

    fn visit_mut_expr(&mut self, n: &mut Expr) {
        n.visit_mut_children_with(self);
        if self.arg_recorder.is_some() {
            *n = self.enclose_in_tap(n);
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
    program.fold_with(&mut as_folder(TransformVisitor::new_with_metadata(&metadata)))
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

    #[testing::fixture("tests/fixtures/*/input.mjs")]
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