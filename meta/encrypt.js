import crypto from "crypto";
var key = Buffer.from('MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=', 'base64');

/**
 * Encrypt a string
 * @param {string} text - The plaintext string to encrypt
 * @returns {string} The encrypted string
 */
export function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        key,
        iv
    );
    let encrypted = Buffer.concat([iv, cipher.update(text, 'utf8'), cipher.final()]);
    return encrypted.toString('base64url');
}

/**
 * Decrypt a string
 * @param {string} encrypted - The encrypted string
 * @returns {string} The decrypted string
 */
export function decrypt(encrypted) {
    const ivCiphertext = Buffer.from(encrypted, 'base64url');
    const iv = ivCiphertext.subarray(0, 16);
    const ciphertext = ivCiphertext.subarray(16);
    const cipher = crypto.createDecipheriv(
        'aes-256-cbc',
        key,
        iv
    );
    let decrypted = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
    return decrypted.toString('utf-8');
}
