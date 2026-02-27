import { render } from '@testing-library/react-native';
import React from 'react';

import { NotificationsScreen } from '@screens/notifications/NotificationsScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'notifications.title': 'Notifications',
          'notifications.empty.body': 'You are all caught up for now.',
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('NotificationsScreen i18n', () => {
  it('renders translated notification empty state copy', () => {
    const { getByText } = render(<NotificationsScreen />);
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('You are all caught up for now.')).toBeTruthy();
  });
});
