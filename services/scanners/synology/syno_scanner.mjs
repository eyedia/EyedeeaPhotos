import { list_dir, list_dir_items } from "./syno_client.mjs"
import { clear_scan, get_last_inserted_diff, save_item, 
    start_scan, stop_scan, save_scan_log_detail, 
    get_scan_log_detail, update_scan_log } from "../../../meta/meta_scan.mjs"
import {search_init} from "../../../meta/meta_search.mjs";
import config_log from "../../../config_log.js";

const logger = config_log.logger;
let _interval_id = 0;
let _scan_log_id = 0;
let _failed_folders_tried = false;
let _failed_folders = 0;

function keep_checking_when_insert_stops() {
    _interval_id = setInterval(() => {
        logger.info("Validating last scan...");
        get_last_inserted_diff((err, rows) => {
            if (err) {
                logger.error(err);
            } else {
                if (rows) {
                    let timed_out = rows.diff > 0.0005;
                    console.log(`Diff: ${rows.diff}, timed out: ${timed_out}`)
                    if (timed_out) {
                        end_scan();
                    }
                }
            }
        });
    }, 1000 * 30);          // Check every 30 seconds


    setTimeout(() => {
        clearInterval(_interval_id);
        logger.error("Scanning timed out. Please check logs, read documentation and increase timeout if neccessary.");
    }, 1000 * 60 * 7);    //Auto stop after 7 minutes
}

function end_scan() {
    logger.info("Started secondary scans (retrying failed folders)...");

    if (!_failed_folders_tried) {
        scan_failed_folders();
    } else {
        logger.info("Scan completed successfully!");
        let info = "Scan completed successfully";
        let scan_log_end_data = {
            "id": _scan_log_id,
            "info": info
        }
        stop_scan(scan_log_end_data);
        clearTimeout(_interval_id);
        search_init();
        console.log("Scanning FINiiiiiiiiiiiiiiiiished.");
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
                    list_dir_loop(_scan_log_id, row.folder_id, row.folder_name, m_offset, m_limit);
                    update_scan_log(_scan_log_id, row.folder_id, 1);
                });
            } else {
                end_scan();
            }
        }
    });

}

export async function scan(folder_id = -1, folder_name = "") {

    _failed_folders_tried = false;
    _scan_log_id = 0;
    _interval_id = 0;
    keep_checking_when_insert_stops();

    let m_offset = 0;
    let m_limit = 1000;

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
                    list_dir(undefined, m_offset, m_limit)
                        .then(data => {
                            if (data && data.data.list.length > 0) {
                                data.data.list.forEach(function (root_folder) {
                                    list_dir_loop(scan_log_id, root_folder.id, root_folder.name, m_offset, m_limit);
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
                    list_dir_loop(scan_log_id, folder_id, folder_name, m_offset, m_limit);
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

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}