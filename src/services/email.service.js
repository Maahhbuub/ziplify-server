import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;

    await resend.emails.send({
        from: 'Ziplify <ziplify@send.mahbub.tech>',
        to: email,
        subject: 'Verify your Ziplify account',
        html: `
            <h2>Welcome to Ziplify</h2>
            <p>Click below to verify your email address:</p>
            <a href="${verifyUrl}">Verify Email</a>
            <p>This link expires in 24 hours.</p>
        `,
    });
};

export { sendVerificationEmail };