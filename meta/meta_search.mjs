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

export function search(callback) {
    let query = `SELECT * FROM view_filter where current = 1 LIMIT 1`;

    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 1) {
                let filter_data = rows[0];
                //let filter_data = {"filter_must": "belize"}
                query = `SELECT photo_id 
                        FROM fts 
                        WHERE fts MATCH '${filter_data.filter_must}'`
                get_rows(query, (err, rows) => {
                    if (err) {
                        callback(err, null, null);
                    } else {
                        const photo_ids = rows.map(row => row.photo_id).join(',');
                        callback(null, filter_data.id, photo_ids);
                    }
                });
            } else {
                callback(null, null);
            }
        }
    });
}

export function get_tokens_2(callback) {

    let tokens = []
    get_rows("SELECT distinct address FROM photo", (err, rows) => {
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
    get_rows("SELECT distinct folder_name FROM photo", (err, rows) => {
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