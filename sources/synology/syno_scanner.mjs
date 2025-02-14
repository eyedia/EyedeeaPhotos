import { list_dir, list_dir_items } from "./syno_client.mjs"
import {
    clear_scan, get_last_inserted_diff, save_item,
    start_scan, stop_scan, save_scan_log_detail,
    get_scan_log_detail, update_scan_log
} from "../../meta/meta_scan.mjs"
import { get_rows } from "../../meta/meta_base.mjs";
import { search_init } from "../../meta/meta_search.mjs";
import config_log from "../../config_log.js";

const logger = config_log.logger;
let _interval_id = 0;
let _timeout_id = 0;
let _scan_log_id = 0;
let _failed_folders_tried = false;
let _failed_folders = 0;
let _offset = 0;
let _limit = 1000;

export function scanner_is_busy() {
    return _timeout_id == 0 ? false : true;
}

export async function scan(folder_id = -1, folder_name = "") {

    if (_timeout_id != 0) {
        //already a scan running, return bad
        logger.error("Another scan was requested and the request was ignored as scanning is already in progress.");
        return;
    }

    _failed_folders_tried = false;
    _scan_log_id = 0;

    _timeout_id = setTimeout(() => {
        clearInterval(_interval_id);
        _interval_id = 0;
        end_scan(true);
        logger.error("Scanning timed out. Please check logs, read documentation and increase timeout if neccessary.");
    }, 1000 * 60 * 12);    //Auto stop after 12 minutes

    _interval_id = setInterval(() => {
        keep_checking_when_insert_stops();
    }, 1000 * 30);          // Check every 30 seconds

    logger.info(`Scanner root timeout id:${_timeout_id} and interval id:${_interval_id}`);
    
    //save scan log
    let scan_log_data = {
        "root_folder_id": folder_id,
        "root_folder_name": folder_name,
        "info": ""
    }

    clear_scan(() => {
        start_scan(scan_log_data, (err, scan_log_id) => {
            if (err) {
                logger.error(err.message);
            } else {
                _scan_log_id = scan_log_id;
                if ((folder_id === -1) && (folder_name === "")) {
                    let info = "";
                    //scan starts from root
                    list_dir(undefined, _offset, _limit)
                        .then(data => {
                            if (data && data.data.list.length > 0) {
                                data.data.list.forEach(function (root_folder) {
                                    list_dir_loop(scan_log_id, root_folder.id, root_folder.name, _offset, _limit);
                                });
                            } else {
                                logger.info("Nothing to scan. No root folders!");
                                info = "";
                                let scan_log_end_data = {
                                    "id": scan_log_id,
                                    "info": info
                                }
                                stop_scan(scan_log_end_data);
                            }
                        });


                } else {
                    //scan starts from a specific folder
                    logger.info("Starting scanning from a specific folder...", folder_id, folder_name);
                    list_dir_loop(scan_log_id, folder_id, folder_name, _offset, _limit);
                }

            }
        });
    });

}

async function list_dir_loop(scan_log_id, folder_id, folder_name, offset, limit) {
    logger.info(`01-Getting sub folder ${folder_id}...`);
    list_dir(folder_id, offset, limit)
        .then(async data => {
            if (data) {
                if (data.data.list.length > 0) {
                    data.data.list.forEach(function (folder) {
                        logger.info(`02-Getting sub folder ${folder.id} of folder ${folder_id}...`);
                        list_dir_loop(scan_log_id, folder.id, folder.name, offset, limit);
                    });
                } else {
                    logger.info(`Getting photos from ${folder_id}-${folder_name}...`);
                    list_dir_items(folder_id, offset, limit)
                        .then(async photo_data => {
                            if (photo_data) {
                                photo_data.data.list.forEach(function (photo) {
                                    let one_record = {
                                        "photo_id": photo.id,
                                        "filename": photo.filename,
                                        "folder_id": photo.folder_id,
                                        "folder_name": folder_name,
                                        "time": photo.time,
                                        "type": photo.type,
                                        "orientation": photo.additional.orientation,
                                        "cache_key": photo.additional.thumbnail.cache_key,
                                        "unit_id": photo.additional.thumbnail.unit_id,
                                        "geocoding_id": photo.additional.geocoding_id,
                                        "tags": photo.additional.tag.map(t => t.name).join(","),
                                        "address": JSON.stringify(photo.additional.address)
                                    }
                                    save_item(one_record);
                                });
                            } else {
                                logger.info("Server resource exhausted. Cooling down for 5 seconds...");
                                let scan_failed_data = {
                                    "folder_id": folder_id,
                                    "folder_name": folder_name,
                                    "info": "debug info, blah",
                                    "scan_log_id": scan_log_id
                                }
                                save_scan_log_detail(scan_failed_data);
                                //await wait(5000);
                            }
                        });
                }
            } else {
                logger.info("Server resource exhausted. Cooling down for 5 seconds...");
                let scan_failed_data = {
                    "folder_id": folder_id,
                    "folder_name": folder_name,
                    "info": "",
                    "scan_log_id": scan_log_id
                }
                save_scan_log_detail(scan_failed_data);
                //await wait(5000);
            }
        });
}


function keep_checking_when_insert_stops() {
    logger.info("Validating last scan...");
    get_last_inserted_diff((err, rows) => {
        if (err) {
            logger.error(err);
        } else {
            if (rows) {
                let timed_out = rows.diff > 0.0005;
                logger.info(`Diff: ${rows.diff}, timed out: ${timed_out}`)
                if (timed_out) {
                    clearInterval(_interval_id);
                    _interval_id = 0;
                    end_scan();
                }
            }
        }
    });

}


function end_scan(timed_out) {

    if (!_failed_folders_tried) {
        logger.info("Started secondary scans (retrying failed folders)...");
        scan_failed_folders();
    } else {
        if (!timed_out) {
            logger.info("Scan completed successfully. Getting summary data...");
            get_rows("select count(*) as cnt from photo", (err, rows) => {
                let total_photos = 0;
                if (err) {
                    logger.error(err.message);
                } else {
                    if (rows.length == 1) {
                        total_photos = rows[0]["cnt"];
                    }
                }

                let scan_log_end_data = {
                    "id": _scan_log_id,
                    "info": `Scan completed successfully. Total photos: ${total_photos}`
                }
                stop_scan(scan_log_end_data);
                clearTimeout(_timeout_id);
                _timeout_id = 0;
                logger.info("Scanning Finished.");
            });
        } else {
            logger.info("Ending a timed out scan..");
            let scan_log_end_data = {
                "id": _scan_log_id,
                "info": "Scan timed out!"
            }
            stop_scan(scan_log_end_data);
            clearInterval(_interval_id);
            _interval_id = 0;

            clearTimeout(_timeout_id);
            _timeout_id = 0;
            logger.info("Scanning Finished(timed out).");
        }
    }
}

function scan_failed_folders() {
    _failed_folders_tried = true;
    get_scan_log_detail(_scan_log_id, undefined, (err, rows) => {
        if (err) {
            logger.error(err);
        } else {
            if (rows && rows.length > 0) {
                _failed_folders = rows.length;
                rows.forEach(function (row) {
                    logger.info(`Retrying failed folders: ${row.folder_id}: ${row.folder_name}`);
                    list_dir_loop(_scan_log_id, row.folder_id, row.folder_name, _offset, _limit);
                    update_scan_log(_scan_log_id, row.folder_id, 1);
                });
            } else {
                end_scan();
            }
        }
    });

}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}