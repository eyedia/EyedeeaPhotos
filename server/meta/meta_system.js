import logger from "../config_log.js";
import { meta_db } from "./meta_base.mjs";




export function get_source_summary(callback) {
    let query = `SELECT 
        s.id AS source_id,
        s.name, 
        COALESCE(photo_count.total_photos, 0) AS total_photos, 
        COALESCE(MAX(sl.updated_at), 'N/A') AS last_scanned_at
    FROM source s
    LEFT JOIN (
        SELECT 
            p.source_id, 
            COUNT(*) AS total_photos 
        FROM photo p 
        GROUP BY p.source_id
    ) photo_count ON s.id = photo_count.source_id
    LEFT JOIN scan_log sl ON s.id = sl.source_id
    WHERE s.is_deleted = 0
    GROUP BY s.id, s.name
    ORDER BY s.created_at;`;

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
