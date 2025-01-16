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

export function save_scan_log(json_data) {

    // json_data = {
    //     "folder_id": 820,
    //     "folder_name": "folder name",
    //     "debug_info": "debug info, blah"
    // }
    const insert_query = `INSERT INTO scan_log (folder_id, folder_name, debug_info) VALUES (?, ?, ?)`;

    meta_db.run(
        insert_query,
        [json_data.folder_id, json_data.folder_name, json_data.debug_info],
        function (err) {
            if (err) {
                logger.error('Error inserting data:', err);
            }
        });

}

export function get_scan_log(callback){
    let query = `SELECT * FROM scan_log WHERE re_scanned = 0`
    get_rows(query, (err, rows) => {       
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

export function update_scan_log(folder_id, re_scanned){
    meta_db.run(
    `UPDATE scan_log set re_scanned = ?, updated_at = ? where folder_id = ?`,
    [re_scanned, Date.now(), folder_id],
    function (err) {
        if (err) {
            logger.error('Error updating data:', err);
        }
    });
}

