import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname
});

const eslintConfig = [
  // Ignore build artifacts and vendor dirs to avoid linting generated code
  {
    ignores: [".next/**", "out/**", "build/**", "dist/**", "coverage/**", "node_modules/**"]
  },
  ...compat.config({
    extends: ["next", "prettier"]
  })
];

export default eslintConfig;
