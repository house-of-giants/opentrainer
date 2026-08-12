// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["jest.setup.js", "**/*.test.tsx", "**/*.test.ts"],
    languageOptions: {
      globals: { jest: "readonly" },
    },
    rules: {
      "react/display-name": "off",
    },
  }
]);
