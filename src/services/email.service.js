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

export { sendVerificationEmail };