import z from "zod";

export const personalMapSchema = z.object({
    first_name: z.string().min(1,"firstName is required"),
    last_name: z.string().min(1,"lastName is required"),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    birth_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
    birth_place_country: z.string().min(1,"birth place country is required"),
    birth_place_city: z.string().min(1,"birth place city is required"),
});
