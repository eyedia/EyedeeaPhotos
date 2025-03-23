
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { meta_db } from '../../meta/meta_base.mjs';
import { save_item as meta_save_item, 
  stop_scan as meta_stop_scan } from "../../meta/meta_scan.mjs"
import {generate_short_GUID} from "../../meta/encrypt.js"
import logger from "../../config_log.js";
import { start_scanning} from '../scanner.js';
import { get_exif_data, total_geo_apis, reset_fs_client } from "./fs_client.mjs";
import {generate_thumbnail} from "./fs_thumbnails.mjs";


let total_photos = 0;
let total_dirs = 0;

export async function scan(source, inform_caller_scan_started, inform_caller_scan_ended) {
  if(!fs.existsSync(source.url)){
    inform_caller_scan_started(`Source ${source.name} was not configuration correctly, ${source.url} does not exist!`, null);
    return;
  }
  total_photos = 0;
  total_dirs = 1;

  let scan_start_data = {
    source: source,
    clean_photos: true,
    max_time_in_mins: 2,
    interval_in_secs: 10,
    insert_data_threshold: 0.0002
  }
  reset_fs_client();
  start_scanning(scan_start_data, (err, scan_started_data) => {
    if (err) {
      logger.error(err);
      inform_caller_scan_started(err, null);
    } else {
      inform_caller_scan_started(null, scan_started_data);
      internal_scan(source, source.url);
    }
  },
    fs_scanning_ended,
    inform_caller_scan_ended);
}

async function internal_scan(source, dir) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      logger.error('Error reading folder:', err);
      return;
    }

    files.forEach(file => {
      const photo_path = path.join(dir, file);
      fs.stat(photo_path, (err, stats) => {
        if (err) {
          logger.error('Error getting file stats:', err);
          return;
        }
        if (stats.isFile() && path.extname(file).toLowerCase() === '.jpg') {
          total_photos++;
          get_exif_data(source.id, photo_path, (err, exif_data) => {
            let one_record = {
              "source_id": source.id,
              "photo_id": generate_short_GUID(),
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
            generate_thumbnail(source.url, photo_path);
            meta_save_item(one_record);
          });


        } else if (stats.isDirectory()) {
          total_dirs++;
          internal_scan(source, photo_path); // Recursive call for subdirectories
        }
      });
    });
  });
}

function fs_scanning_ended(err, scan_log_end_data, inform_caller_scan_ended) {
  scan_log_end_data.total_dirs = total_dirs;
  scan_log_end_data.total_photos = total_photos;
  scan_log_end_data.total_geo_apis = total_geo_apis;
  //scan_log_end_data.info += `Google MAP API was called ${total_geo_apis} times.`;
  logger.info(`Google MAP API was called ${total_geo_apis} times.`);
  meta_stop_scan(scan_log_end_data);

  if(inform_caller_scan_ended)
    inform_caller_scan_ended(scan_log_end_data);
}