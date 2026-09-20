// @ts-check
const eslint = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const globals = require("globals");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  eslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      // React Native globals — document, window, navigator are web-only
      globals: {
        ...globals.es2021,
        ...globals.node,
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
        AbortController: "readonly",
        alert: "readonly",
        confirm: "readonly",
        process: "readonly",
        require: "readonly",
        __dirname: "readonly",
        module: "readonly",
        exports: "readonly",
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        NodeJS: "readonly",
      },
    },
    rules: {
      // --- Safety: catch the bugs we've been seeing ---

      // Disallow `any` — forces proper types (was `acc: any` in reports.tsx)
      "@typescript-eslint/no-explicit-any": "warn",

      // Catch unused variables (warn, not error, for gradual cleanup)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",

      // React Hooks: correct deps — prevents stale closure bugs
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",

      // No console.log in production code (warn, not error)
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],

      // Catch accidental debugger statements
      "no-debugger": "error",

      // No unused expressions
      "no-unused-expressions": "error",

      // Let TypeScript handle no-undef — it knows the environment better
      "no-undef": "off",
    },
  },
  {
    files: ["**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "build/",
      "assets/",
      "*.config.*",
    ],
  },
];
