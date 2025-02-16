
import fs from 'fs';
import path from 'path';
import { meta_db } from '../../meta/meta_base.mjs';
import { save_item as meta_save_item } from "../../meta/meta_scan.mjs"
import config_log from "../../config_log.js";
import { start_scanning, scanner_is_busy as base_scanner_is_busy } from '../scanner.js';
const logger = config_log.logger;

export function scanner_is_busy() {
  return base_scanner_is_busy();
}

export async function scan(source, dir, callback) {
  let scan_start_data = {
    source: source,
    max_time_in_mins: 2,
    interval_in_secs: 10,
    insert_data_threshold: 0.0002
  }
  start_scanning(scan_start_data, (err, scan_started_data) => {
    if (err) {
      logger.error(err);
      callback(err, null);
    } else {
      callback(null, scan_started_data);
      internal_scan(source, dir);
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
      const file_path = path.join(dir, file);
      fs.stat(file_path, (err, stats) => {
        if (err) {
          console.error('Error getting file stats:', err);
          return;
        }
        if (stats.isFile() && path.extname(file).toLowerCase() === '.jpg') {
          let one_record = {
            "source_id": source.id,
            "photo_id": undefined,
            "filename": file_path,
            "folder_id": -1,
            "folder_name": undefined,
            "time": undefined,
            "type": undefined,
            "orientation": undefined,
            "cache_key": undefined,
            "unit_id": undefined,
            "geocoding_id": undefined,
            "tags": undefined,
            "address": undefined
          }
          meta_save_item(one_record);

        } else if (stats.isDirectory()) {
          internal_scan(source, file_path); // Recursive call for subdirectories
        }
      });
    });
  });
}

function fs_scanning_ended(err, scan_log_end_data) {
  if (scan_log_end_data) {
    meta_db.run("update photo set photo_id = id where source_id = 2", (err) => {
      if (err) {
        logger.error(err.message);
      } else {
        logger.info('FS photo_ids updated successfully.');
      }
    });
  }
}