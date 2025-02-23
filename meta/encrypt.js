import crypto from "crypto";

const algorithm = "aes-256-gcm";
const secretKey = crypto.randomBytes(32); // Generate a 256-bit key

/**
 * Encrypt a string
 * @param {string} text - The plaintext string to encrypt
 * @returns {string} The encrypted string
 */
export function encrypt(text) {
    const iv = crypto.randomBytes(16); // Generate a random IV
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    const authTag = cipher.getAuthTag(); // Get the authentication tag

    // Concatenate IV + encrypted text + auth tag and encode in Base64
    return Buffer.concat([iv, Buffer.from(encrypted, "base64"), authTag]).toString("base64");
}

/**
 * Decrypt a string
 * @param {string} encryptedText - The encrypted string
 * @returns {string} The decrypted string
 */
export function decrypt(encryptedText) {
    const encryptedBuffer = Buffer.from(encryptedText, "base64");

    const iv = encryptedBuffer.slice(0, 16); // Extract IV
    const authTag = encryptedBuffer.slice(-16); // Extract Auth Tag
    const encrypted = encryptedBuffer.slice(16, -16); // Extract Encrypted Data

    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}
