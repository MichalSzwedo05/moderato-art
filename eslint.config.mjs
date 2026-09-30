import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...fixupConfigRules(nextVitals),
  ...fixupConfigRules(nextTypeScript),
  {
    files: ["app/api/**/route.ts"],
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }] },
  },
  globalIgnores([".next/**", "node_modules/**", "coverage/**"]),
]);
