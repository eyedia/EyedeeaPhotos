import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";

// Handle SIGTERM and SIGINT signals
process.on('SIGINT', close_database);
process.on('SIGTERM', close_database);

const logger = config_log.logger;
const dbFile = './meta/synoplayer.db';
let meta_db = null;

export async function meta_init() {
    const dbExists = fs.existsSync(dbFile);
    meta_db = open_database();
    if (!dbExists) {
        create_tables();
    }
}
function open_database() {
    return new sqlite3.Database(dbFile,
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (err) => {
            if (err) {
                logger.error('Error opening database:', err.message);
                process.exit(1);
            }
            logger.info('Connected to database:', dbFile);
        });
}

function close_database() {
    logger.info('Closing database...');
    meta_db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database closed successfully.');
        }
        process.exit(0);
    });
}

function create_tables() {
    const createTableQueries = [
        `CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            param TEXT,
            param_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );`,

        `CREATE TABLE photo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id INT UNIQUE NOT NULL,
            filename TEXT NOT NULL, 
            folder_id INT NOT NULL,
            folder_name TEXT,
            time INT,
            type TEXT,
            orientation INT, 
            cache_key TEXT,
            unit_id INT,
            geocoding_id INT,
            tags TEXT,
            address TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );`,

        `CREATE TABLE scan_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INT NOT NULL,
            folder_name TEXT NOT NULL,
            debug_info TEXT,
            re_scanned bool default false,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
            );`,

        `CREATE TABLE view_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id INT NOT NULL UNIQUE,
            count INT NOT NULL DEFAULT 0,
            client_ip_address TEXT NOT NULL,
            client_user_agent_family TEXT,
			client_user_agent_os_family TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
            );`
    ];

    createTableQueries.forEach((query) => {
        meta_db.run(query, (err) => {
            if (err) {
                logger.error(err.message);
            } else {
                logger.info('Table created successfully.');
            }
        });
    });
}

export function save_photo(json_data) {

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

export function scan_log(json_data) {

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


export function save_view_log(json_data) {
    // json_data = {
    //     "photo_id": 820,
    //     "count": 1,
    //     "client_ip_address": "127.0.0.1",
    //     "client_user_agent_family": "chrome",
    //     "client_user_agent_os_family": "windows"
    // }
    json_data["count"] = 1;
    let query = `SELECT * FROM view_log WHERE photo_id = ${json_data.photo_id}`
    get_rows(query, (err, rows) => {       
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 0) {
                meta_db.run(
                    `INSERT INTO view_log (photo_id, count ,client_ip_address, client_user_agent_family, client_user_agent_os_family) VALUES (?, ?, ?, ?, ?)`,
                    [json_data.photo_id, json_data.count, json_data.client_ip_address, json_data.client_user_agent_family, json_data.client_user_agent_os_family],
                    function (err) {
                        if (err) {
                            logger.error('Error inserting data:', err);
                        }
                    });
            } else {
                json_data["count"] = rows[0]["count"] + 1;
                json_data["client_ip_address"] = rows[0]["client_ip_address"] + ", " + json_data["client_ip_address"];
                json_data["client_user_agent_family"] = rows[0]["client_user_agent_family"] + ", " + json_data["client_user_agent_family"];
                json_data["client_user_agent_os_family"] = rows[0]["client_user_agent_os_family"] + ", " + json_data["client_user_agent_os_family"];

                meta_db.run(
                    `UPDATE view_log set count = ? ,client_ip_address = ?, client_user_agent_family = ?, client_user_agent_os_family = ?, updated_at = ? where photo_id = ?`,
                    [json_data.count, json_data.client_ip_address, json_data.client_user_agent_family, json_data.client_user_agent_os_family, Date.now(), json_data.photo_id],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                        }
                    });
            }
        }
    });

}

export function get_scan_failed_folders(callback){
    let query = `SELECT * FROM scan_log WHERE re_scanned = 0`
    get_rows(query, (err, rows) => {       
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

export function update_scan_failed_folder(folder_id, re_scanned){
    meta_db.run(
    `UPDATE scan_log set re_scanned = ?, updated_at = ? where folder_id = ?`,
    [re_scanned, Date.now(), folder_id],
    function (err) {
        if (err) {
            logger.error('Error updating data:', err);
        }
    });
}

export function get_rows(query, callback) {

    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}


export function get_photos(callback) {
    //let query = "SELECT * FROM photo WHERE type='photo' and id IN (SELECT id FROM photo WHERE type='photo' ORDER BY RANDOM() LIMIT 100)"
    let query = "SELECT * FROM photo WHERE id IN(35001,38543,40368)";
    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}
