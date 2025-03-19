import config_log from "../config_log.js";
import { meta_db } from "./meta_base.mjs";

const logger = config_log.logger;


export function get_source_summary(callback) {
    let query = `select p.source_id,s.name, 
    (select count(*) from photo p where p.source_id = s.id)
    total_photos, max(sl.updated_at) last_scanned_at from photo p
    inner join scan_log sl on sl.source_id = p.source_id
    inner join source s on p.source_id = s.id
    group by p.source_id, s.name`;

    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            if (rows) {
                let grand_total_sources = 0;
                let grand_total_photos = 0;
                rows.forEach(row => {
                    grand_total_sources++;
                    grand_total_photos += row.total_photos;
                })
                callback(null,
                    {
                        "summary": {
                            "total_sources": grand_total_sources,
                            "total_photos": grand_total_photos
                        },
                        "details": rows
                    }
                );
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

        meta_db.all("SELECT photo_id, cache_key, source_id, folder_name FROM fts WHERE fts MATCH ? LIMIT ? OFFSET ?", 
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