import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";
import { meta_db, get_rows } from "./meta_base.mjs";


export function save_item(json_data) {

    // json_data = {
    //     "photo_id": 32265,
    //     "filename": "DSC_0173.JPG",
    //     "folder_id": 820,
    //     "folder_name": "folder name",
    //     "time": 1422185896,
    //     "type": "photo",
    //     "orientation": 1,
    //     "cache_key": "32265_1734881011",
    //     "unit_id": 32265,
    //     "geocoding_id": 4,
    //     "tags": "devina,portrait",
    //     "address": ""
    // }
    const insert_query = `INSERT INTO photo (photo_id, filename, folder_id, folder_name, time, type, orientation, cache_key, unit_id, geocoding_id, tags, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    meta_db.run(
        insert_query,
        [json_data.photo_id, json_data.filename, json_data.folder_id, json_data.folder_name, json_data.time, json_data.type, json_data.orientation, json_data.cache_key, json_data.unit_id, json_data.geocoding_id, json_data.tags, json_data.address],
        function (err) {
            if (err) {
                logger.error('Error inserting data:', err);
            }
        });
}


export function start_scan(json_data, callback) {
    const insert_query = `INSERT INTO scan_log (root_folder_id, root_folder_name, info) VALUES (?, ?, ?)`;
    return meta_db.run(
        insert_query,
        [json_data.root_folder_id, json_data.root_folder_name, json_data.info],
        function (err) {
            if (err) {
                logger.error('Error inserting data:', err);
                if (callback) {
                    callback(err, null);
                }
            } else {
                if (callback) {
                    callback(null, this.lastID);
                }
            }
        });
}

export function stop_scan(json_data, callback) {
    const insert_query = `UPDATE scan_log set updated_at =?, info =? WHERE id =?`;
    return meta_db.run(
        insert_query,
        [Date.now(), json_data.info, json_data.id],
        function (err) {
            if (err) {
                logger.error('Error updating data:', err);
                if (callback) {
                    callback(err, null);
                }
            } else {
                if (callback) {
                    callback(null, this.lastID);
                }
            }
        });
}


export function save_scan_log_detail(json_data, callback) {

    // json_data = {
    //     "folder_id": 820,
    //     "folder_name": "folder name",
    //     "info": "debug info, blah"
    // }
    const insert_query = `INSERT INTO scan_log_detail (folder_id, folder_name, info, scan_log_id) VALUES (?, ?, ?, ?)`;

    meta_db.run(
        insert_query,
        [json_data.folder_id, json_data.folder_name, json_data.info, json_data.scan_log_id],
        function (err) {
            if (err) {
                logger.error('Error inserting data:', err);
                if (callback) {
                    callback(err, null);
                }
            } else {
                if (callback) {
                    callback(null, this.lastID);
                }
            }
        });

}

export function get_scan_log_detail(scan_log_id, scan_status = 0, callback) {
    let query = `SELECT * FROM scan_log_detail WHERE scan_log_id = ${scan_log_id} and re_scanned = ${scan_status}`
    get_rows(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

export function update_scan_log(scan_log_id, folder_id, re_scanned) {
    meta_db.run(
        `UPDATE scan_log_detail set re_scanned = ?, updated_at = ? where scan_log_id = ? and folder_id = ?`,
        [re_scanned, Date.now(), scan_log_id, folder_id],
        function (err) {
            if (err) {
                logger.error('Error updating data:', err);
            }
        });
}

