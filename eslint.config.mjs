import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Many API routes intentionally use `(prisma as any)` to bypass model
      // typing for Prisma models that aren't reflected in generated types.
      // Downgrade to warn so the build doesn't fail.
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow `_`-prefixed unused vars/args for intentional placeholders.
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],

      // The React Compiler experimental rules below flag idiomatic patterns we
      // use intentionally (initial fetches in effects, ref-as-mailbox, useCallback
      // closures). Downgrade to warn — they remain visible in editors but don't
      // block production builds.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
