
import fs from 'fs';
import path from 'path';
import {
  get as meta_get_source
} from "../../meta/meta_source.mjs"
import {
  save_item as meta_save_item
} from "../../meta/meta_scan.mjs"
import { get_rows } from "../../meta/meta_base.mjs";
import config_log from "../../config_log.js";

const logger = config_log.logger;
const source_name = "fs"

export function scanner_is_busy() {
  return false;
}

export async function scan(source, dir) {
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
            "photo_id": Math.random(),     
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
          scan(source, file_path); // Recursive call for subdirectories
        }
      });
    });
  });

}
