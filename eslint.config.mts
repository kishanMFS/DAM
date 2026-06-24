import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(['dist', 'build', 'node_modules']),
  { 
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { 
      globals: globals.browser 
    } 
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
]);
