const getVerificationEmailHtml = (verifyUrl) => `
    <h2>Verify your email</h2>
    <p>Please<a href="${verifyUrl}">click here</a> to verify your email address.</p>
`;

export { getVerificationEmailHtml };
