import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";
import { meta_db } from "./meta_base.mjs";

const logger = config_log.logger;

export function search_init(callback) {
    const create_search_indexes = [
        `DELETE FROM fts`,
        `INSERT INTO fts 
            (photo_id, tags, address) 
            SELECT 
            photo_id, tags, address 
            FROM photo`
    ];

    const promises = create_search_indexes.map((query) => {
        return new Promise((resolve, reject) => {
            meta_db.run(query, (err) => {
                if (err) {
                    logger.error(err.message);
                    reject(err);
                } else {
                    logger.info('.');
                    resolve();
                }
            });
        });
    });

    Promise.all(promises)
        .then(() => callback(null))
        .catch((err) => callback(err));
}


export function search(callback) {
    let query = `SELECT * FROM view_filter where current = 1 LIMIT 1`;

    meta_db.get(query, (err, filter_data) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (filter_data) {
                query = `SELECT photo_id 
                        FROM fts 
                        WHERE fts MATCH ?`;
                meta_db.all(query, [filter_data.filter_must],
                    (err, rows) => {
                    if (err) {
                        callback(err, null, null);
                    } else {
                        const photo_ids = rows.map(row => `'${row.photo_id}'`).join(',');
                        callback(null, filter_data.id, photo_ids);
                    }
                });
            } else {
                callback(null, null);
            }
        }
    });
}


export function global_search(keywords, offset, limit, callback) {
    limit = parseInt(limit) || 10;
    offset = parseInt(offset) || 0;

    meta_db.get("SELECT COUNT(*) as count FROM fts WHERE fts MATCH ?",
        [keywords], (err, row) => {
        if (err) {
            callback(err, null);
        }
        let total_records = row.count;
        let total_pages = Math.ceil(total_records / limit);

        meta_db.all(`SELECT fts.photo_id, source_id, filename, folder_name, cache_key FROM fts 
            inner join photo p on p.photo_id = fts.photo_id
            WHERE fts MATCH ? LIMIT ? OFFSET ?`, 
            [keywords, limit, offset],
            (err, rows) => {
                if (err) {
                    logger.error(err.message);
                    callback(err, null);
                } else {
                    callback(null, {
                        total_records: total_records,
                        total_pages: total_pages,
                        current_offset: offset,
                        limit: limit,
                        records: rows
                    });
                }
        });
    });
}

export function get_tokens_2(callback) {

    let tokens = []
    meta_db.all("SELECT distinct address FROM photo", (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            rows.forEach(row => {
                let address = JSON.parse(row.address);
                if (address != null) {                    
                    const address_value_array = Object.values(address);
                    address_value_array.forEach(v => {
                        tokens = tokens.concat(v.split(" "));
                    });                    
                }
            });
            const unique_tokens = [...new Set(tokens.filter(t => t.length >= 3))];
            callback(null, unique_tokens);
        }
    });
}


export function get_tokens(callback) {

    let tokens = []
    meta_db.all("SELECT distinct folder_name FROM photo", (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            rows.forEach(row => {
                let items = row["folder_name"].split("/");
                for (let i = 0; i < items.length; i++) {
                    let item = items[i].replaceAll("-", " ")
                        .replaceAll("_", " ")
                        .replaceAll("'", " ")
                        .replaceAll("&", " ");
                    let words = item.split(" ");
                    tokens = tokens.concat(words);
                }
                //tokens = tokens.concat(items);
            });
            const unique_tokens = [...new Set(tokens.filter(t => t.length >= 3))];
            callback(null, unique_tokens);
        }
    });
}