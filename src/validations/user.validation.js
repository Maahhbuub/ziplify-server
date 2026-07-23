import { z } from "zod";

export const createUserSchema = z.object({
    body: z.object({
        name: z
            .string({
                required_error: "Name is required",
            })
            .trim()
            .min(1, "Name is required")
            .max(50, "Name cannot exceed 50 characters"),

        email: z
            .string({
                required_error: "Email is required",
            })
            .trim()
            .email("Invalid email address")
            .transform((email) => email.toLowerCase()),

        password: z
            .string({
                required_error: "Password is required",
            })
            .min(6, "Password must be at least 6 characters")
            .max(100, "Password cannot exceed 100 characters"),
    }),
});

export const loginUserSchema = z.object({
    body: z.object({
        email: z
            .string({
                required_error: "Email is required",
            })
            .trim()
            .email("Invalid email address"),

        password: z
            .string({
                required_error: "Password is required",
            })
            .min(1, "Password is required"),
    }),
});