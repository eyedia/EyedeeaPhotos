import config_log from "../config_log.js";
import { meta_db } from "./meta_base.mjs";

const logger = config_log.logger;


export function get_source_summary(callback) {
    let query = `select p.source_id,s.name, count(*)total_photos, max(sl.updated_at) last_scanned_at from photo p
        inner join scan_log sl on sl.source_id = p.source_id
        inner join source s on p.source_id = s.id
        group by p.source_id`;

    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {            
            callback(null, rows);            
        }
    });
}