import { z } from 'zod';

type TranslateFn = (key: string) => string;

export const createLoginSchema = (t: TranslateFn) =>
  z.object({
    email: z.email(t('auth.validation.invalidEmail')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  });
