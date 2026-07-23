const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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
        num = num * BASE + ALPHABET.indexOf(char);
    }
    return num;
}

export { encode, decode };