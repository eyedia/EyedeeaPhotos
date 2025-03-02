import config_log from "../config_log.js";
import { meta_db } from "./meta_base.mjs";

const logger = config_log.logger;

export function list(source_id, callback) {
    let query = `select * from scan_log where source_id = ?`;
    meta_db.all(query, [source_id], (err, rows) => {
        if (err) {
            logger.error(err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

export function get(id, callback) {
    let query = `select * from scan_log where id = ?`;
    meta_db.get(query, [id],
        (err, view_log) => {
            if (err) {
                logger.error(err.message);
                callback(err, null);
            } else{
                callback(null, view_log);
            }
        });
}
