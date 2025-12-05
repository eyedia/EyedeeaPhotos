import crypto from "crypto";
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const algorithm = 'aes-256-gcm';
import logger from "../config_log.js";

// Get the directory of the current file (safe, fixed path)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  } catch(error){
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
    const platform = os.platform();
    if (platform.startsWith("win")) {       
      const scriptPath = path.join(__dirname, 'set_env.ps1');
      checkAndSetEnvKey(scriptPath, 'windows');
      const output = execSync('powershell -Command "[System.Environment]::GetEnvironmentVariable(\'EYEDEEA_KEY\', [System.EnvironmentVariableTarget]::User)"', { encoding: 'utf-8' });      
      process.env.EYEDEEA_KEY = output.trim();
    } else {      
      const scriptPath = path.join(__dirname, 'set_env.sh');
      checkAndSetEnvKey(scriptPath, 'unix');
    }
  }
  keyHex = process.env.EYEDEEA_KEY;
  if (!keyHex) {
      logger.error("'EYEDEEA_KEY' environment variable was not found! Try restarting Eyedeea Photos!");
      return;
  }
  const key = Buffer.from(keyHex, 'hex');
  return key;
}

export function generate_short_GUID() {
  return crypto.randomBytes(8).toString("hex");
}

const checkAndSetEnvKey = (scriptPath, platform) => {
  if (!process.env.EYEDEEA_KEY) {
      console.log("EYEDEEA_KEY not found. Generating and setting it...");
      try {
          // SAFE: No shell: true, pass script path as argument instead
          if (platform === 'windows') {
              execSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], { 
                  stdio: 'inherit',
                  shell: false
              });
          } else {
              execSync('bash', [scriptPath], { 
                  stdio: 'inherit',
                  shell: false
              });
          }
      } catch (error) {
          console.error("Error setting EYEDEEA_KEY:", error.message);
      }
  } else {
      console.log("EYEDEEA_KEY is already set.");
  }
};