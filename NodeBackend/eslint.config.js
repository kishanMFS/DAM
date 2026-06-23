
import eslint from "@eslint/js";
import tseslint from 'typescript-eslint';
// import perfectionist from "eslint-plugin-perfectionist";
import pluginJest from "eslint-plugin-jest";
import { error } from "node:console";


export default [    
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/*.js', '**/*.jsx', 'dist/**', '_test_/**'],
  },
  // TypeScript plugin rules
  {    
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      jest: pluginJest,
    },
    files: [ "**/*.ts", "**/*.tsx" ],
    rules : {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ]
    },
  },
];

// perfectionist.configs['recommended-natural'],