import z from 'zod';

export const RegisterSchema = z.object({
    email: z.email(),
    password: z.string().min(1,'Password is Required'),
    name: z.string().min(1,'Name is Required'),
    handle: z.string().min(1,'Handle is Required'),
});
