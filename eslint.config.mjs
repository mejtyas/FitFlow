import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['prisma/**'],
    rules: {
      'max-lines': ['error', { max: 375, skipBlankLines: false, skipComments: false }],
      semi: ['error', 'always'],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-unused-vars': 'off',
      quotes: ['error', 'single', { avoidEscape: true }],
      curly: ['error', 'all'],
    },
  },
];

export default eslintConfig;
