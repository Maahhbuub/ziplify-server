import crypto from 'crypto';

function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

export { generateVerificationToken };