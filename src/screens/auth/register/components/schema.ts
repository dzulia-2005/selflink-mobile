import z from 'zod';

export const RegisterSchema = z.object({
    email: z.email(),
    password: z.string().min(1,'Password is Required'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    name: z.string().min(1,'Name is Required'),
    handle: z.string().min(1,'Handle is Required'),
}).refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
});
