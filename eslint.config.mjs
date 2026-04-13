import js from "@eslint/js";
import parser from "@typescript-eslint/parser";
import plugin from "@typescript-eslint/eslint-plugin";
import stylisticJs from "@stylistic/eslint-plugin-js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        "files": ["**/*.ts"],
        "languageOptions": {
            "parser": parser,
            "ecmaVersion": "latest",
            "sourceType": "module",
            "parserOptions": {
                "project": "./tsconfig.json"
            },
            "globals": {
                ...globals.node,
                ...globals.es2021,
            }
        },
        "plugins": {
            "@typescript-eslint": plugin,
            "@stylistic/js": stylisticJs
        },
        "rules": {
            "indent": ["error", 4, { "SwitchCase": 1 }],
            "max-nested-callbacks": ["error", { "max": 4 }],
            "no-empty-function": ["error", { "allow": ["constructors"] }],
            "no-explicit-any": "off",
            "no-implicit-coercion": "error",
            "no-lonely-if": "error",
            "no-multiple-empty-lines": ["error", { "max": 1 }],
            "no-multi-assign": "error",
            "no-param-reassign": "error",
            "no-return-assign": "error",
            "no-self-compare": "error",
            "no-shadow": "error",
            "no-template-curly-in-string": "error",
            "no-undef": "off",
            "no-useless-return": "error",
            "no-unneeded-ternary": "error",
            "no-unused-expressions": "error",
            "no-unused-vars": "off",
            "no-warning-comments": "warn",
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "yoda": "error",
            "@stylistic/js/max-len": ["error", { "code": 150, "ignoreStrings": true, "ignoreTemplateLiterals": true, "ignoreComments": true }],
            "@stylistic/js/no-trailing-spaces": "error",
            "@stylistic/js/object-curly-spacing": ["error", "always"],
            "@stylistic/js/linebreak-style": "error",
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/explicit-member-accessibility": "error",
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    "format": [
                        "camelCase",
                        "UPPER_CASE"
                    ],
                    "selector": [
                        "function",
                        "variable",
                        "parameter",
                        "classProperty",
                        "classMethod"
                    ],
                    "leadingUnderscore": "allow"
                }
            ],
            "@typescript-eslint/no-deprecated": "error",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-unused-vars": "off",
        }
    }
]