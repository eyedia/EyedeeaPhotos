
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { meta_db } from '../../meta/meta_base.mjs';
import { save_item as meta_save_item, stop_scan as meta_stop_scan } from "../../meta/meta_scan.mjs"
import config_log from "../../config_log.js";
import { start_scanning, scanner_is_busy as base_scanner_is_busy } from '../scanner.js';
import { get_exif_data, google_map_api_called, reset_fs_client } from "./fs_client.mjs";
const logger = config_log.logger;


export async function scan(source, callback) {
  if(!fs.existsSync(source.url)){
    callback(`Source ${source.name} was not configuration correctly, ${source.url} does not exist!`, null);
    return;
  }
  let scan_start_data = {
    source: source,
    max_time_in_mins: 2,
    interval_in_secs: 10,
    insert_data_threshold: 0.0002
  }
  reset_fs_client();
  start_scanning(scan_start_data, (err, scan_started_data) => {
    if (err) {
      logger.error(err);
      callback(err, null);
    } else {
      callback(null, scan_started_data);
      internal_scan(source, source.url);
    }
  },
    fs_scanning_ended);
}

async function internal_scan(source, dir) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return;
    }

    files.forEach(file => {
      const photo_path = path.join(dir, file);
      fs.stat(photo_path, (err, stats) => {
        if (err) {
          console.error('Error getting file stats:', err);
          return;
        }
        if (stats.isFile() && path.extname(file).toLowerCase() === '.jpg') {
          get_exif_data(photo_path, (err, exif_data) => {
            let one_record = {
              "source_id": source.id,
              "photo_id": crypto.randomUUID(),
              "filename": photo_path,
              "folder_id": -1,
              "folder_name": path.dirname(photo_path),
              "time": exif_data.create_date,
              "type": "photo",
              "orientation": 1,
              "cache_key": undefined,
              "unit_id": undefined,
              "geocoding_id": undefined,
              "tags": exif_data.tags,
              "address": JSON.stringify(exif_data.address)
            }
            meta_save_item(one_record);
          });


        } else if (stats.isDirectory()) {
          internal_scan(source, photo_path); // Recursive call for subdirectories
        }
      });
    });
  });
}

function fs_scanning_ended(err, scan_log_end_data) {
  scan_log_end_data.info += `Google MAP API was called ${google_map_api_called} times.`;
  logger.info(scan_log_end_data.info);
  meta_stop_scan(scan_log_end_data);
}