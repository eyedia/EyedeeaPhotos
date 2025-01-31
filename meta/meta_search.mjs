import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";
import { meta_db, get_rows } from "./meta_base.mjs";

const logger = config_log.logger;

export function search_init() {
    const create_search_indexes = [
        `DELETE FROM fts`,
        
        `INSERT INTO fts 
            (photo_id, folder_name, tags, address) 
            SELECT 
            photo_id, folder_name, tags, address 
            FROM photo;`
    ];

    create_search_indexes.forEach((query) => {
        meta_db.run(query, (err) => {
            if (err) {
                logger.error(err.message);
            } else {
                logger.info('Search indexes initialized successfully.');
            }
        });
    });
}
