const getVerificationEmailHtml = (verifyUrl) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f2f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f6; padding:40px 0;">
            <tr>
                <td align="center">
                    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; border:1px solid #e5e7eb;">
                        <tr>
                            <td style="padding:24px 32px; border-bottom:1px solid #e5e7eb;">
                                <h1 style="margin:0; font-size:20px; color:#111827; font-weight:600;">Ziplify</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:32px;">
                                <h2 style="margin:0 0 16px; font-size:18px; color:#111827; font-weight:600;">Verify your email address</h2>
                                <p style="margin:0 0 16px; font-size:14px; color:#374151; line-height:1.6;">
                                    Thanks for signing up for Ziplify. To complete your registration, please verify your email address by clicking the button below.
                                </p>
                                <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                                    <tr>
                                        <td align="center" style="border-radius:6px;" bgcolor="#111827">
                                            <a href="${verifyUrl}" style="display:inline-block; padding:12px 20px; font-size:14px; color:#ffffff; text-decoration:none; font-weight:500;">Verify Email</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin:0 0 12px; font-size:13px; color:#6b7280; line-height:1.5;">
                                    This link will expire in 24 hours. If you did not create an account, no further action is required.
                                </p>
                                <p style="margin:16px 0 4px; font-size:12px; color:#9ca3af;">
                                    If the button above does not work, copy and paste this URL into your browser:
                                </p>
                                <p style="margin:0; font-size:12px; color:#2563eb; word-break:break-all;">${verifyUrl}</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:24px 32px; border-top:1px solid #e5e7eb;">
                                <p style="margin:0; font-size:12px; color:#9ca3af;">&copy; 2026 Ziplify. All rights reserved.</p>
                                <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">This is an automated message - please do not reply.</p>
                            </td>
                        </tr>
                    </table>
                    <table width="560" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:16px 0; text-align:center;">
                                <p style="font-size:11px; color:#c0c4cc; margin:0;">Securely powered by Ziplify</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
`;

export { getVerificationEmailHtml };
