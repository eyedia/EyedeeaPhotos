import logger from "../config_log.js";
import { meta_db } from "./meta_base.mjs";




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
