import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Designer files (browser scripts, PE-62) are not part of the project code.
  { ignores: ['dist/', 'node_modules/', 'docs/design/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
