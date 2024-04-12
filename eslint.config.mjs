import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname
});

export default tseslint.config({
  files: ["**/*.mts"],
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...compat.extends('eslint-config-semistandard'),
  ],
  rules: {
    "no-unused-private-class-members": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  },
  languageOptions: {
    globals: {
      NodeJS: "readonly"
    }
  }
});
