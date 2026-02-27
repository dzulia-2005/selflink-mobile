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
        'src/screens/feed/FeedScreen.tsx',
        'src/screens/feed/CreatePostScreen.tsx',
        'src/components/FeedPostCard.tsx',
        'src/components/MentorFeedCard.tsx',
        'src/components/MatrixFeedCard.tsx',
        'src/components/SoulMatchFeedCard.tsx',
        'src/screens/feed/PostDetailsScreen.tsx',
        'src/components/comments/CommentsBottomSheet.tsx',
        'src/components/comments/CommentComposer.tsx',
        'src/components/comments/CommentItem.tsx',
        'src/screens/profile/ProfileScreen.tsx',
        'src/screens/astro/BirthDataScreen.tsx',
        'src/components/astro/BirthLocationMapModal.tsx',
        'src/screens/notifications/NotificationsScreen.tsx',
        'src/screens/InboxScreen.tsx',
        'src/screens/messaging/ThreadsScreen.tsx',
        'src/components/messaging/ThreadListItem.tsx',
        'src/components/ThreadCard.tsx',
        'src/screens/mentor/MentorHomeScreen.tsx',
        'src/screens/mentor/DailyMentorScreen.tsx',
        'src/screens/mentor/DailyMentorEntryScreen.tsx',
        'src/screens/mentor/NatalMentorScreen.tsx',
        'src/screens/mentor/MentorChatScreen.tsx',
        'src/screens/SoulMatchScreen.tsx',
        'src/screens/soulmatch/SoulMatchRecommendationsScreen.tsx',
        'src/screens/soulmatch/SoulMatchDetailsScreen.tsx',
        'src/screens/soulmatch/SoulMatchMentorScreen.tsx',
        'src/components/soulmatch/SoulMatchUpgradeSheet.tsx',
        'src/screens/astro/NatalChartScreen.tsx',
        'src/components/astro/natal/NatalCards.tsx',
        'src/screens/PaymentsScreen.tsx',
        'src/screens/WalletLedgerScreen.tsx',
        'src/App.tsx',
        'src/screens/onboarding/view/PersonalMapScreen.tsx',
        'src/components/ErrorState.tsx',
        'src/components/StateViews.tsx',
        'src/components/LoadingOverlay.tsx',
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
    {
      files: ['src/screens/**/*.tsx'],
      excludedFiles: [
        'src/screens/LoginScreen.tsx',
        'src/screens/RegisterScreen.tsx',
        'src/screens/CommunityScreen.tsx',
        'src/screens/MessagesScreen.tsx',
        'src/screens/messaging/ChatScreen.tsx',
        'src/screens/profile/SearchProfilesScreen.tsx',
        'src/screens/video/SoulReelsScreen.tsx',
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "JSXOpeningElement[name.name='TextInput'] JSXAttribute[name.name='placeholder'][value.type='Literal']",
            message:
              'Use i18n translation keys for TextInput placeholders (e.g., t("...")).',
          },
          {
            selector:
              "JSXOpeningElement[name.name='TextInput'] JSXAttribute[name.name='placeholder'][value.type='JSXExpressionContainer'][value.expression.type='TemplateLiteral'][value.expression.expressions.length=0]",
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
