module.exports = {
  root: true,
  extends: ['@react-native-community'],
  plugins: ['react', 'react-hooks', 'import'],
  rules: {
    'prettier/prettier': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@services/api/client',
            message:
              'Use @api/client (apiClient or serviceApiClient) as the single canonical HTTP client.',
          },
        ],
      },
    ],
    'import/order': [
      'warn',
      {
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          {
            pattern: '@{components,screens,theme,navigation,utils,hooks}/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
      },
    ],
  },
  overrides: [
    {
      files: [
        'src/screens/profile/ProfileEditScreen.tsx',
        'src/screens/auth/login/view/LoginScreen.tsx',
        'src/screens/auth/register/view/RegisterScreen.tsx',
        'src/screens/auth/SocialLoginScreen.tsx',
        'src/navigation/RootNavigator.tsx',
        'src/navigation/MainTabsNavigator.tsx',
      ],
      rules: {
        'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "JSXOpeningElement[name.name='TextInput'] JSXAttribute[name.name='placeholder'][value.type='Literal']",
            message:
              'Use i18n translation keys for TextInput placeholders (e.g., t("...")).',
          },
        ],
      },
    },
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      'babel-module': {},
    },
  },
};
