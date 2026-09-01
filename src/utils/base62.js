const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length;

function encode(num) {
    if (num === 0) return ALPHABET[0];
    let result = '';
    while (num > 0) {
        result = ALPHABET[num % BASE] + result;
        num = Math.floor(num / BASE);
    }
    return result;
}

function decode(str) {
    let num = 0;
    for (const char of str) {
        const value = CHAR_MAP[char];
        if (value === undefined) {
            throw new Error(`Invalid character: ${char}`);
        }
        num = num * BASE + value;
    }
    return num;
}

export { encode, decode };