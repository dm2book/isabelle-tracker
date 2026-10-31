import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Pages under (world) only render on the client after boot; reading the clock / random values for
      // decorative effects is intentional, so these React-Compiler hints are warnings, not errors.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      // Full page loads after sign-in/out are deliberate: they re-boot the store with the new session.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
