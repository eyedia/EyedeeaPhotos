import crypto from "crypto";
const algorithm = 'aes-256-gcm';
import config_log from "../config_log.js";
const logger = config_log.logger;

export function encrypt(text) {
  const iv = crypto.randomBytes(12); // 96-bit IV
  const key = get_key();
  if(!key)
    return;
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const en_str = en_to_string(iv.toString('hex'), authTag, encrypted);
  return en_str;
  //return { encrypted, authTag, iv: iv.toString('hex') };
}
export function decrypt(encrypted) {
  try{
  const en_data = string_to_en(encrypted);
  const key = get_key();
  if(!key)
    return;
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(en_data.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(en_data.auth_tag, 'hex'));
  let decrypted = decipher.update(en_data.e_text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}catch(error){
  logger.error(error);
  return undefined;
}
}

function string_to_en(encrypted){
  const iv = encrypted.substring(0,24)
  const auth_tag = encrypted.substring(24,24+32)
  const e_text = encrypted.substring(24+32, encrypted.length)
  return {iv, auth_tag, e_text}
}

function en_to_string(iv, auth_tag, encrypted){
  return iv + auth_tag + encrypted;
}

function get_key(){
  let keyHex = process.env.EYEDEEA_KEY;
  if (!keyHex) {
      logger.error("'EYEDEEA_KEY' environment variable was not found! Please resinstall or contact support.");
      return;
  }
  const key = Buffer.from(keyHex, 'hex');
  return key;
}

export function generate_short_GUID() {
  return crypto.randomBytes(8).toString("hex");
}