import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";
import { meta_db } from "./meta_base.mjs";

export function get_photos(callback) {
    let query = "SELECT * FROM photo WHERE type='photo' and id IN (SELECT id FROM photo WHERE type='photo' ORDER BY RANDOM() LIMIT 100)"
    //let query = "SELECT * FROM photo WHERE id IN(35001,38543,40368)";
    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
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

