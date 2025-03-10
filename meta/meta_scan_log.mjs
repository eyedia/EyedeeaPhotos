import config_log from "../config_log.js";
import { meta_db } from "./meta_base.mjs";

const logger = config_log.logger;

export function list(source_id, limit, offset, callback) {
    limit = parseInt(limit) || 10;
    offset = parseInt(offset) || 0;

    meta_db.get("SELECT COUNT(*) as count FROM scan_log where source_id = ?",
        [source_id], (err, row) => {
            if (err) {
                callback(err, null);
            }
            let total_records = row.count;
            let total_pages = Math.ceil(total_records / limit);            
            let query = `select id, IFNULL(root_folder_id, 'Default') root_folder_id,
                IFNULL(root_folder_name, 'Default') root_folder_name,
                IFNULL(total_photos,'N/A') total_photos,
                IFNULL(total_dirs,'N/A') total_dirs,
                IFNULL(total_geo_apis,'N/A') total_geo_apis,                
                IFNULL(strftime('%Y-%m-%d %H:%M:%S', created_at, 'localtime'), 'N/A') created_at,
                IFNULL(strftime('%Y-%m-%d %H:%M:%S', updated_at, 'localtime'), 'N/A') updated_at
                from scan_log where source_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
            meta_db.all(query, [source_id, limit, offset], (err, rows) => {
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

export function get(id, callback) {
    let query = `select * from scan_log where id = ?`;
    meta_db.get(query, [id],
        (err, view_log) => {
            if (err) {
                logger.error(err.message);
                callback(err, null);
            } else {
                callback(null, view_log);
            }
        });
}
