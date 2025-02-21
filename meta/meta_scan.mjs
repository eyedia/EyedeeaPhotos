import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";
import { meta_db, get_rows } from "./meta_base.mjs";

const logger = config_log.logger;


export function clear_scan(source_id, callback) {
    const clean_queries = [
        `DELETE FROM photo WHERE source_id = ${source_id}`,
        `delete from view_log where photo_id not in (select photo_id from photo)`];
    
    let total_queries = clean_queries.length
    clean_queries.forEach((query) => {
        meta_db.run(
            query,
            function (err) {
                if (err) {
                    logger.error('Error deleting data from photo:', err);
                } else {
                    total_queries = total_queries - 1;                    
                }
                if(total_queries <=0){                    
                    if (callback)
                        callback();
                }
            });
    });
}


export function save_item(json_data) {
    const insert_query = `INSERT or IGNORE INTO photo (source_id, photo_id, filename, folder_id, folder_name, time, type, orientation, cache_key, unit_id, geocoding_id, tags, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    meta_db.run(
        insert_query,
        [json_data.source_id, json_data.photo_id, json_data.filename, json_data.folder_id, json_data.folder_name, json_data.time, json_data.type, json_data.orientation, json_data.cache_key, json_data.unit_id, json_data.geocoding_id, json_data.tags, json_data.address],
        function (err) {
            if (err) {
                logger.error('Error inserting data:', err);
            }
        });
}


export function start_scan(json_data, callback) {
    const insert_query = `INSERT INTO scan_log (source_id, root_folder_id, root_folder_name, info) VALUES (?, ?, ?, ?)`;
    return meta_db.run(
        insert_query,
        [json_data.source_id, json_data.root_folder_id, json_data.root_folder_name, json_data.info],
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


export function get_last_inserted_diff(callback) {
    let query = `select julianday(CURRENT_TIMESTAMP) - julianday(created_at) diff from photo order by created_at desc limit 1`
    get_rows(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            if (rows && rows.length > 0) {
                callback(null, rows[0]);
            } else {
                callback(null, 0);
            }
        }
    });
}


export function save_geo_address(json_data) {
    const insert_query = `INSERT or IGNORE INTO geo_address (latitude, longitude, address) VALUES (?, ?, ?)`;

    meta_db.run(
        insert_query,
        [json_data.latitude, json_data.longitude, json_data.address],
        function (err) {
            if (err) {
                logger.error('Error inserting data:', err);
            }
        });
}

export function get_geo_address(latitude, longitude, callback) {
    let query = `select address from geo_address where latitude = ${latitude} and longitude =${longitude}`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err);
            callback(undefined);
        } else {
            if (rows && rows.length > 0) {
                callback(rows[0]);
            } else {
                callback(undefined);
            }
        }
    });
}