import z from 'zod';

type TranslateFn = (key: string) => string;

export const createRegisterSchema = (t: TranslateFn) =>
  z
    .object({
      email: z.email(t('auth.validation.invalidEmail')),
      password: z.string().min(1, t('auth.validation.passwordRequired')),
      confirmPassword: z
        .string()
        .min(1, t('auth.validation.confirmPasswordRequired')),
      name: z.string().min(1, t('auth.validation.nameRequired')),
      handle: z.string().min(1, t('auth.validation.handleRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: t('auth.validation.passwordMismatch'),
    });
