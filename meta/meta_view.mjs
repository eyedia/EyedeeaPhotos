import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";
import { meta_db, get_rows } from "./meta_base.mjs";

const logger = config_log.logger;

export function get_random_photo(callback) {
    let query = "SELECT * FROM view_log WHERE current = true LIMIT 1";
    //let query = "SELECT * FROM photo WHERE id IN(35001,38543,40368)";
    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            rows.forEach(function (row) {
                row.detail = JSON.parse(JSON.stringify(row.detail));
            });
            callback(null, rows);
        }
    });
}

export function set_random_photo() {

    let json_data = {};
    let query = `SELECT * FROM photo WHERE id IN (SELECT id FROM photo WHERE type='photo' ORDER BY RANDOM() LIMIT 1)`;

    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 1) {
                let photo_data = rows[0];
                query = `SELECT * FROM view_log WHERE photo_id = ${photo_data.photo_id}`
                get_rows(query, (err, rows) => {
                    if (err) {
                        logger.error(err.message);
                    } else {
                        if (rows.length == 0) {
                            console.log("inserting...")
                            meta_db.run(
                                `INSERT INTO view_log (photo_id, detail) VALUES (?, ?)`,
                                [photo_data.photo_id, JSON.stringify(photo_data)],
                                function (err) {
                                    if (err) {
                                        logger.error('Error inserting data:', err);
                                    }
                                });
                        } else {
                            console.log("update");
                            meta_db.run(
                                `UPDATE view_log set count = ?, current = true, updated_at = ? where photo_id = ?`,
                                [photo_data.count + 1, Date.now(), photo_data.photo_id],
                                function (err) {
                                    if (err) {
                                        logger.error('Error updating data:', err);
                                    }
                                });
                        }

                        meta_db.run(
                            `UPDATE view_log set current = false where photo_id != ?`,
                            [photo_data.photo_id],
                            function (err) {
                                if (err) {
                                    logger.error('Error updating data:', err);
                                }
                            });
                    }
                });
            }
        }
    });
}

