import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "dist/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      "@next/next/no-img-element": "off",
      "@stylistic/semi": ["error", "never"],
      "react-hooks/refs": "off",
      "react/no-unescaped-entities": "off",
      "import/order": ["warn", {
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true,
        },
        "newlines-between": "always",
        "distinctGroup": false,
        "groups": ["builtin", "external", "internal", ["parent", "sibling", "index"]],
        "pathGroupsExcludedImportTypes": [],
        "pathGroups": [
          {
            "pattern": "react",
            "group": "external",
            "position": "before",
          },
          {
            "pattern": "{@/ui,@/ui/**}",
            "group": "internal",
            "position": "after",
          },
          {
            "pattern": "@/**",
            "group": "internal",
          },
          {
            "pattern": "../**",
            "group": "parent",
            "position": "before",
          },
          {
            "pattern": "{./,.}",
            "group": "index",
            "position": "after",
          },
        ],
      }],
    }
  }
])

export default eslintConfig
