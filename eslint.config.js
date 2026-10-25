import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Designer files (browser scripts, PE-62) are not part of the project code.
  { ignores: ['dist/', 'node_modules/', 'docs/design/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  // Design principle 1: colours and fonts come from tokens only (src/config/theme.ts).
  {
    files: ['src/scenes/**/*.ts', 'src/entities/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'No colour literals here. Use a design token from src/config/theme.ts.',
        },
        {
          selector: 'Literal[raw=/^0[xX][0-9a-fA-F]{6}$/]',
          message: 'No 0xRRGGBB colour literals here. Use a design token from src/config/theme.ts.',
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{6}/]',
          message: 'No colour literals here. Use a design token from src/config/theme.ts.',
        },
        {
          selector: 'Literal[value=/monospace/i]',
          message: 'No system fonts here. Use the font tokens from src/config/theme.ts.',
        },
      ],
    },
  },
);
