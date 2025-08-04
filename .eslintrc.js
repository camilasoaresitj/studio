module.exports = {
  root: true,
  extends: ['next', 'prettier'],
  plugins: ['@typescript-eslint', 'react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@next/next/no-html-link-for-pages': 'off',
    'react/no-unescaped-entities': 'off',
  },
};
