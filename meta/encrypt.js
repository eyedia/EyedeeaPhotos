import crypto from "crypto";
import appDataPath from 'appdata-path';
import fs from 'fs';
import pathModule from 'path'

const algorithm = "aes-256-gcm";


function get_or_generate_key(){
    const path = appDataPath('EyedeeaPhotos');
    const file_path = pathModule.join(path, 'data.txt');
    let secret_key = "";
    if (!fs.existsSync(file_path)) {
        secret_key = crypto.randomBytes(32);
        fs.writeFileSync(file_path, Buffer.from(secret_key));
        console.log(`${file_path} - Data written to file successfully!`);
    }else{
        const data = fs.readFileSync(file_path)
        secret_key = new Uint8Array(data)
    }    
    console.log(secret_key);
    return secret_key;
}

function test(){
    let p = "Mogambo$66"
    let e = encrypt(p);
    console.log("x");
    console.log(e);
    console.log("y");
}

/**
 * Encrypt a string
 * @param {string} text - The plaintext string to encrypt
 * @returns {string} The encrypted string
 */
export function encrypt(text) {
    const secretKey = get_or_generate_key();
    const iv = crypto.randomBytes(16); // Generate a random IV
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag(); // Get the authentication tag

    // Concatenate IV + encrypted text + auth tag and encode in Base64
    return Buffer.from(iv.toString("base64") + encrypted + authTag.toString("base64"), "utf8").toString("base64");
}

/**
 * Decrypt a string
 * @param {string} encryptedText - The encrypted string
 * @returns {string} The decrypted string
 */
export function decrypt(encryptedText) {
    test();
    const secretKey = get_or_generate_key();
    const encryptedBuffer = Buffer.from(encryptedText, "base64").toString("utf8");

    const iv = Buffer.from(encryptedBuffer.slice(0, 24), "base64"); // Extract IV (first 24 chars in Base64)
    const authTag = Buffer.from(encryptedBuffer.slice(-24), "base64"); // Extract Auth Tag (last 24 chars in Base64)
    const encrypted = encryptedBuffer.slice(24, -24); // Extract Encrypted Data (middle part)

    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}
