import {
    save_item as meta_save_item,
    clear_scan as meta_clear_scan,
    start_scan as meta_start_scan,
    stop_scan as meta_stop_scan,
    get_last_inserted_diff
} from "../meta/meta_scan.mjs"

import { meta_db } from "../meta/meta_base.mjs";
import config_log from "../config_log.js";
import { search_init } from '../meta/meta_search.mjs';

const logger = config_log.logger;
let _interval_id = 0;
let _timeout_id = 0;
let _scan_log_id = 0;

export function scanner_is_busy() {
    return _timeout_id == 0 ? false : true;
}

export function start_scanning(scan_start_data, callback_started, callback_ended, inform_caller_scan_ended) {
    if (_timeout_id != 0) {
        //already a scan running, return bad
        logger.error("Scanning is already in progress!");
        return;
    }
    _scan_log_id = 0;

    _timeout_id = setTimeout(() => {
        clearInterval(_interval_id);
        _interval_id = 0;
        stop_scanning(true, undefined, callback_ended, inform_caller_scan_ended);
        logger.error(`${scan_start_data.source.name} scanning timed out. Please check logs, read documentation and increase timeout if neccessary.`);
    }, 1000 * 60 * scan_start_data.max_time_in_mins);    //Auto stop after max_time_in_mins minutes

    _interval_id = setInterval(() => {
        keep_checking_when_insert_stops(scan_start_data, callback_ended, inform_caller_scan_ended);
    }, 1000 * scan_start_data.interval_in_secs);

    if (!scan_start_data.scan_log_id) {
        logger.info(`${scan_start_data.source.name} scanning initialized. Timeout id:${_timeout_id} and interval id:${_interval_id}`);
        let scan_log_data = {
            "source_id": scan_start_data.source.id
        }

        meta_clear_scan(scan_start_data.source.id, () => {
            meta_start_scan(scan_log_data, (err, scan_log_id) => {
                if (err) {
                    logger.error(err.message);
                } else {
                    _scan_log_id = scan_log_id;
                    let scan_started_data = {
                        "scan_log_id": scan_log_id,
                        "source_id": scan_start_data.source.id
                    }
                    callback_started(null, scan_started_data)
                }
            });
        });
    } else {
        logger.info(`${scan_start_data.source.name} 2nd round scanning initialized. Timeout id:${_timeout_id} and interval id:${_interval_id}`);
        _scan_log_id = scan_start_data.scan_log_id;
        callback_started(null, scan_start_data)
    }
}

function keep_checking_when_insert_stops(scan_start_data, callback_ended, inform_caller_scan_ended) {
    logger.info("Validating last scan...");
    get_last_inserted_diff((err, rows) => {
        if (err) {
            logger.error(err);
        } else {
            if (rows) {
                let timed_out = rows.diff > scan_start_data.insert_data_threshold;   //0.0002;
                logger.info(`${scan_start_data.source.name} scan diff: ${rows.diff}, timed out: ${timed_out}`)
                if (timed_out) {
                    clearInterval(_interval_id);
                    _interval_id = 0;
                    stop_scanning(scan_start_data, undefined, callback_ended, inform_caller_scan_ended);
                }
            }
        }
    });

}

export function stop_scanning(scan_start_data, timed_out, callback_ended, inform_caller_scan_ended) {
    if (!timed_out) {
        let number_of_photos = 0;
        meta_db.get(`select count(*) as cnt from photo where source_id = ?`, [scan_start_data.source.id],
            (err, count_data) => {
                if (err) {
                    logger.error(err.message);
                } else {
                    if (count_data) {
                        number_of_photos = count_data["cnt"];
                    }
                }
                let scan_log_end_data = {
                    "id": _scan_log_id,
                    //"info": `${scan_start_data.source.name} scanning finished. Total ${number_of_photos} photos found.`,
                    "total_photos":number_of_photos,
                    "source": scan_start_data.source
                }
                meta_stop_scan(scan_log_end_data);
                clearTimeout(_timeout_id);
                _timeout_id = 0;
                _interval_id = 0;
                logger.info(scan_log_end_data.info);
                search_init();
                callback_ended(null, scan_log_end_data, inform_caller_scan_ended);
            });
    } else {
        let scan_log_end_data = {
            "id": _scan_log_id,
            "info": `${scan_start_data.source.name} scanning timed out!`,
            "source": scan_start_data.source
        }
        stop_scan(scan_log_end_data);
        clearInterval(_interval_id);
        _interval_id = 0;
        clearTimeout(_timeout_id);
        _timeout_id = 0;
        callback_ended(null, scan_log_end_data, inform_caller_scan_ended);
    }
}
