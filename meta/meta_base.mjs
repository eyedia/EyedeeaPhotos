import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";

process.on('SIGINT', close_database);
process.on('SIGTERM', close_database);

const logger = config_log.logger;
const dbFile = './meta/eyedeea_photos.db';

const dbExists = fs.existsSync(dbFile);
export const meta_db = new sqlite3.Database(dbFile,
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
        if (err) {
            logger.error(`Error opening database:${dbFile}`, err);
            process.exit(1);
        }
        logger.info(`Connected to database: ${dbFile}`);
        if (!dbExists) {
            create_tables(tables_created => {
            });
        }
    });


function create_tables(callback) {
    const create_table_queries = [
        `CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            param TEXT,
            param_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );`,

        `CREATE TABLE source (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
			url TEXT NOT NULL,
			user TEXT,
			password TEXT,
            config TEXT,
            cache TEXT,            
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
            );`,

        `CREATE TABLE photo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INT,
            photo_id TEXT UNIQUE,            
            filename TEXT NOT NULL, 
            folder_id INT,
            folder_name TEXT,
            time INT,
            type TEXT NOT NULL,
            orientation INT, 
            cache_key TEXT,
            unit_id INT,
            geocoding_id INT,
            tags TEXT,
            address TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(source_id) REFERENCES source(id)
            );`,

        `CREATE TABLE scan_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INT,
            root_folder_id INT,
            root_folder_name TEXT,
            info TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(source_id) REFERENCES source(id)
            );`,

        `CREATE TABLE scan_log_detail (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INT NOT NULL,
            folder_name TEXT NOT NULL,
            info TEXT,
            re_scanned bool default false,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
			scan_log_id INT,
			FOREIGN KEY(scan_log_id) REFERENCES scan_log(id)
            );`,

        `CREATE TABLE view_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id TEXT NOT NULL UNIQUE,
            count INT NOT NULL DEFAULT 1,
            status INT DEFAULT 0 NOT NULL,
            current BOOL DEFAULT 0,
            view_filter_id INT,
            update_sequence INT default 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,            
			FOREIGN KEY(view_filter_id) REFERENCES view_filter(id)
            );`,

        `CREATE VIRTUAL TABLE fts 
            USING FTS5(photo_id,folder_name,tags,address);`,

        `CREATE TABLE view_filter (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
            filter_must TEXT NOT NULL,
			filter_option TEXT,
			current BOOL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );`,

        `CREATE TABLE tag (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
            syno_id INTEGER UNIQUE NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
            );`,

        `CREATE TABLE geo_address (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude DECIMAL,
            longitude DECIMAL,
            address TEXT
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(latitude, longitude) ON CONFLICT REPLACE
            );`
    ];

    let table_to_be_created = create_table_queries.length;

    create_table_queries.forEach((query) => {
        meta_db.run(query, (err) => {
            if (err) {
                logger.error(err.message);
            } else {
                table_to_be_created--;
                logger.info('Table created successfully.');
                if (table_to_be_created == 0)
                    callback(create_table_queries.length);
            }
        });
    });
}

function close_database() {
    logger.info('Closing database...');
    meta_db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            logger.info('Database closed successfully.');
        }
        process.exit(0);
    });
}
