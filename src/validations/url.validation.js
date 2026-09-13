import { z } from "zod";

const RESERVED_ALIASES = ['auth', 'dashboard', 'not-found', 'api', 'login', 'signup', 'admin', 'static'];

const createUrlSchema = z.object({
    body: z.object({
        longUrl: z
            .string({ required_error: "longUrl is required" })
            .trim()
            .min(1, "longUrl cannot be empty")
            .url("Please provide a valid URL")
            .max(2048, "URL is too long")
            .refine((url) => {
                try {
                    const parsed = new URL(url);
                    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
                } catch {
                    return false;
                }
            }, { message: "Only http and https URLs are allowed" }),

        alias: z
            .string()
            .trim()
            .min(3, "Alias must be at least 3 characters")
            .max(20, "Alias must be under 20 characters")
            .regex(/^[a-zA-Z0-9-]+$/, "Alias can only contain letters, numbers, and hyphens")
            .refine((val) => !RESERVED_ALIASES.includes(val.toLowerCase()), {
                message: "This alias is reserved and cannot be used",
            })
            .optional(),

        expiresInDays: z
            .number()
            .int()
            .positive("Expiration must be a positive number of days")
            .max(3650, "Expiration cannot exceed 10 years")
            .optional(),
    })
});

const updateUrlSchema = z.object({
    body: z.object({
        longUrl: z
            .string({ required_error: "longUrl is required" })
            .trim()
            .min(1, "longUrl cannot be empty")
            .url("Please provide a valid URL")
            .max(2048, "URL is too long")
            .refine((url) => {
                try {
                    const parsed = new URL(url);
                    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
                } catch {
                    return false;
                }
            }, { message: "Only http and https URLs are allowed" }),
    }),
});

export { createUrlSchema, updateUrlSchema }