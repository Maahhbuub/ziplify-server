import { Resend } from 'resend';
import { getVerificationEmailHtml } from '../templates/verification-email.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;

    await resend.emails.send({
        from: 'Ziplify <ziplify@mahbub.tech>',
        to: email,
        subject: 'Verify your Ziplify account',
        html: getVerificationEmailHtml(verifyUrl),
    });
};

export { sendVerificationEmail };