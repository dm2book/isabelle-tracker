import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Screens allowed to use the camera or microphone. Empty for now: the food scanner and the voice diary
 * will be added here when they are built. Everywhere else the code check below refuses those APIs.
 */
const MEDIA_ALLOWED_FILES = [];

const LOCATION_BLOCKED = {
  object: "navigator",
  property: "geolocation",
  message: "Location is blocked in this app (Permissions-Policy geolocation=()).",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Camera, microphone and location only where they are needed (see MEDIA_ALLOWED_FILES).
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        { property: "getUserMedia", message: "Camera/microphone: only screens listed in MEDIA_ALLOWED_FILES (eslint.config.mjs) may use them." },
        { property: "getDisplayMedia", message: "Screen capture is not used in this app." },
        LOCATION_BLOCKED,
      ],
      "no-restricted-globals": [
        "error",
        { name: "MediaRecorder", message: "Microphone recording: only screens listed in MEDIA_ALLOWED_FILES (eslint.config.mjs) may record." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='capture']", message: "Opening the camera directly: only screens listed in MEDIA_ALLOWED_FILES (eslint.config.mjs)." },
      ],
    },
  },
  ...(MEDIA_ALLOWED_FILES.length
    ? [{ files: MEDIA_ALLOWED_FILES, rules: { "no-restricted-properties": ["error", LOCATION_BLOCKED], "no-restricted-globals": "off", "no-restricted-syntax": "off" } }]
    : []),
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
