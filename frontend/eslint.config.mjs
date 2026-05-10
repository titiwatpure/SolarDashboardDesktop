export default [
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
      'comma-dangle': 'off'
    }
  }
];
