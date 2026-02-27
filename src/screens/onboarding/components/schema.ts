import z from 'zod';

import { i18n } from '@i18n';

export const personalMapSchema = z.object({
    first_name: z.string().min(1, i18n.t('onboarding.validation.firstNameRequired')),
    last_name: z.string().min(1, i18n.t('onboarding.validation.lastNameRequired')),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, i18n.t('onboarding.validation.invalidDateFormat')),
    birth_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, i18n.t('onboarding.validation.invalidTimeFormat')),
    birth_place_country: z
      .string()
      .min(1, i18n.t('onboarding.validation.countryRequired')),
    birth_place_city: z.string().min(1, i18n.t('onboarding.validation.cityRequired')),
});
