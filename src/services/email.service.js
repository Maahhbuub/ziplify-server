import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;

    await resend.emails.send({
        from: 'Ziplify <ziplify@mahbub.tech>',
        to: email,
        subject: 'Verify your Ziplify account',
        html: `
            <h2>Verify your ziplify account</h2>
            <p>Please <a href="${verifyUrl}">click here</a> to verify your email address.</p>
        `
    });
};

const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;

    await resend.emails.send({
        from: 'Ziplify <ziplify@mahbub.tech>',
        to: email,
        subject: 'Reset your Ziplify password',
        html: `
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click <a href="${resetUrl}">Reset Password</a> to choose a new one:</p>
            <p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
        `,
    });
};

export { sendVerificationEmail, sendPasswordResetEmail };