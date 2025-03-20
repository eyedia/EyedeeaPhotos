import sqlite3 from "sqlite3";
import fs from "fs";
import logger from "../config_log.js";
import { meta_db } from "./meta_base.mjs";
import { get_scan_log_summary } from "./meta_scan_log.mjs";




export function clear_scan(source_id, clean_photos, callback) {
    if ((!clean_photos) || (clean_photos == false)) {
        logger.info("Partial scan, not clearing old photos");
        if (callback)
            callback();
        return;
    }

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
                if (total_queries <= 0) {
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
                const scan_log_id = this.lastID;
                const update_query = `UPDATE source set active_scan = true where id = ?`;
                meta_db.run(
                    update_query,
                    [json_data.source_id],
                    function (err) {
                        if (err) {
                            logger.error('Error updating source:', err);
                            if (callback) {
                                callback(err, null);
                            }
                        } else {
                            if (callback) {
                                callback(null, scan_log_id);
                            }
                        }
                    });


            }
        });
}

export function stop_scan(json_data, callback) {
    const insert_query = `UPDATE scan_log set updated_at =strftime('%Y-%m-%d %H:%M:%S', 'now'), 
    total_photos =?,
    total_dirs =?,
    total_geo_apis =?,
    info =?
    WHERE id =?`;
    return meta_db.run(
        insert_query,
        [json_data.total_photos, json_data.total_dirs, json_data.total_geo_apis, json_data.info, json_data.id],
        function (err) {
            if (err) {
                logger.error('Error updating data:', err);
                if (callback) {
                    callback(err, null);
                }
            } else {
                const scan_log_id = this.lastID;
                const update_query = `UPDATE source set active_scan = false where id = ?`;
                meta_db.run(
                    update_query,
                    [json_data.source.id],
                    function (err) {
                        if (err) {
                            logger.error('Error updating source:', err);
                            if (callback) {
                                callback(err, null);
                            }
                        } else {
                            if (callback) {
                                callback(null, scan_log_id);
                            }
                        }
                    });
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
    let query = `SELECT * FROM scan_log_detail WHERE scan_log_id = ? and re_scanned = ?`
    meta_db.all(query, [scan_log_id, scan_status],
        (err, rows) => {
            if (err) {
                callback(err, null);
            } else {
                callback(null, rows);
            }
        });
}

export function update_scan_log(scan_log_id, folder_id, re_scanned) {
    meta_db.run(
        `UPDATE scan_log_detail set re_scanned = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') where scan_log_id = ? and folder_id = ?`,
        [re_scanned, scan_log_id, folder_id],
        function (err) {
            if (err) {
                logger.error('Error updating data:', err);
            }
        });
}


export function get_last_inserted_diff(callback) {
    let query = `select julianday(CURRENT_TIMESTAMP) - julianday(created_at) diff from photo order by created_at desc limit 1`
    meta_db.all(query, (err, rows) => {
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
    let query = `select address from geo_address where latitude = ? and longitude =?`;
    meta_db.all(query, [latitude, longitude],
        (err, rows) => {
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

export function is_active_scan(source_id, callback) {
    let query = `select count(id) cnt from source
        where active_scan = 1
        group by name
        having count(id) > 0`

    if (source_id) {
        query = `select id cnt from source where active_scan = 1 and id = ?`
    }
    meta_db.get(query, [source_id], (err, data) => {
        if (err) {
            callback(err, null);
        } else {
            if (data) {                
                const active = data.cnt > 0 ? true : false;
                if (active) {
                    meta_db.get("select * from scan_log where updated_at is null and source_id = ? ORDER BY created_at DESC LIMIT 1",
                        [source_id], (err, row) => {
                        if (err) {
                            logger.error(err.message);
                        } else {
                            callback(null, { "active": true, "scan_log": row });
                        }
                    });
                } else {
                    callback(null, { "active": false });
                }

            }
            else {
                callback(null, { "active": false });
            }
        }
    });
}