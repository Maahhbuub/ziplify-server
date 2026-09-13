import { z } from "zod";

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