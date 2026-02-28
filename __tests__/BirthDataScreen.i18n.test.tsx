import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { BirthDataScreen } from '@screens/astro/BirthData/view/BirthDataScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@services/api/astro', () => ({
  createOrUpdateNatalChart: jest.fn(),
}));

jest.mock('@context/ToastContext', () => ({
  useToast: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@store/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      personalMap: {
        first_name: 'John',
        last_name: 'Doe',
        birth_date: '1990-01-01',
        birth_time: '10:00',
        birth_place_city: 'Tbilisi',
        birth_place_country: 'Georgia',
      },
      currentUser: {
        birth_date: '1990-01-01',
        birth_time: '10:00',
        birth_place: 'Tbilisi, Georgia',
      },
      fetchProfile: jest.fn(),
    }),
}));

jest.mock('@components/astro/BirthLocationMapModal', () => ({
  BirthLocationMapModal: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'astro.birthData.title': 'Birth Data',
          'astro.birthData.form.required': 'Required',
          'astro.birthData.form.datePlaceholder': 'Date of birth (YYYY-MM-DD)',
          'astro.birthData.form.saveAndGenerate': 'Save & Generate Chart',
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('BirthDataScreen i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders translated birth data form UI', async () => {
    const { getByText, getByPlaceholderText } = render(<BirthDataScreen />);

    await waitFor(() => {
      expect(getByText('Birth Data')).toBeTruthy();
      expect(getByText('Required')).toBeTruthy();
    });

    expect(getByPlaceholderText('Date of birth (YYYY-MM-DD)')).toBeTruthy();
    fireEvent.press(getByText('Save & Generate Chart'));
  });
});
