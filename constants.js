import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import getAppDataPath from 'appdata-path';

const SOURCE_TYPE_NAS = 'nas';
const SOURCE_TYPE_FS = "fs";
const ORG = 'EyediaTech';
const APP_NAME = 'EyedeeaPhotos';

const platform = os.platform();
const is_jest_running = process.env.JEST_WORKER_ID !== undefined

const app_log_dir = (() => {    
    let log_dir = ""
    if (is_jest_running) {
        log_dir = "./logs"
    }
    else if (platform.startsWith("win")) {
        log_dir = path.join(getAppDataPath(ORG), APP_NAME, 'logs');
    } else {
        checkAndSetEnvKey();
        log_dir = "/var/log/EyedeeaPhotos/logs";
    }
    if (!fs.existsSync(log_dir)){
        fs.mkdirSync(log_dir, { recursive: true });
    }
    return log_dir;
})();

const app_db_file = (() => {
    let db_file = "";
    if (is_jest_running) {
        db_file = "./eyedeea_photos.db"
    }
    else if (platform.startsWith("win")) {
        let app_dir = getAppDataPath(ORG).replace("Roaming", "Local")   //dirty hack
        db_file = path.join(app_dir, APP_NAME, 'data', 'eyedeea_photos.db');
    } else {
        db_file =  "/var/lib/EyedeeaPhotos/data/eyedeea_photos.db";
    }
    if (!fs.existsSync(path.dirname(db_file))){
        fs.mkdirSync(path.dirname(db_file), { recursive: true });
    }
    return db_file;
})();

const app_thumbnail_dir = (() => {
    let thumbnail_dir = ""
    if (is_jest_running) {
        thumbnail_dir = "./thumbnails"
    }
    else if (platform.startsWith("win")) {
        let app_dir = getAppDataPath(ORG).replace("Roaming", "Local")   //dirty hack
        thumbnail_dir = path.join(app_dir, APP_NAME, 'data', 'thumbnails');
    } else {
        thumbnail_dir = "/var/lib/EyedeeaPhotos/data/thumbnails";
    }
    if (!fs.existsSync(thumbnail_dir)){
        fs.mkdirSync(thumbnail_dir, { recursive: true });
    }
    return thumbnail_dir;
})();


const checkAndSetEnvKey = async () => {
  if (!process.env.EYEDEEA_KEY) {
      console.log("EYEDEEA_KEY not found. Generating and setting it...");
      try {
          execSync('bash set_env.sh', { stdio: 'inherit' });
      } catch (error) {
          console.error("Error setting EYEDEEA_KEY:", error.message);
      }
  } else {
      console.log("EYEDEEA_KEY is already set.");
  }
};


export default {
    ORG,
    APP_NAME,
    SOURCE_TYPE_NAS,
    SOURCE_TYPE_FS,
    app_log_dir,
    app_db_file,
    app_thumbnail_dir
};

