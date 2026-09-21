import { z } from "zod";

const createUserSchema = z.object({
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

const loginUserSchema = z.object({
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

const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Please provide a valid email"),
    })
});

const resetPasswordSchema = z.object({
    body: z.object({
        password: z
            .string({ required_error: "Password is required" })
            .min(8, "Password must be at least 8 characters"), // match whatever rule your createUserSchema already uses
    })
});

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" }).trim().min(2, "Name must be at least 2 characters").max(50, "Name is too long"),
    })
});

const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string({ required_error: "Current password is required" }),
        newPassword: z.string({ required_error: "New password is required" }).min(6, "Password must be at least 6 characters"),
    })
});

const deleteAccountSchema = z.object({
    body: z.object({
        password: z.string({ required_error: "Password is required to delete your account" }),
    })
});

export { createUserSchema, loginUserSchema, forgotPasswordSchema, resetPasswordSchema, updateProfileSchema, changePasswordSchema, deleteAccountSchema }