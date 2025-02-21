import { list_dir, list_dir_items } from "./syno_client.mjs";
import {
    save_item, save_scan_log_detail,
    get_scan_log_detail, update_scan_log
} from "../../meta/meta_scan.mjs";
import { start_scanning, scanner_is_busy as base_scanner_is_busy } from '../scanner.js';
import config_log from "../../config_log.js";

const logger = config_log.logger;
let _failed_folders_tried = false;

let _offset = 0;
let _limit = 1000;

export async function scan(source, folder_id, folder_name, callback) {
    let scan_start_data = {
        source: source,
        max_time_in_mins: 12,
        interval_in_secs: 30,
        insert_data_threshold: 0.0005
    }
    start_scanning(scan_start_data, (err, scan_started_data) => {
        if (err) {
            logger.error(err);
            callback(err, null);
        } else {
            callback(null, scan_started_data);
            internal_scan(scan_started_data, folder_id, folder_name);
        }
    },
        syno_scanning_ended);
}

async function internal_scan(scan_started_data, folder_id = -1, folder_name = "") {
    if ((folder_id === -1) && (folder_name === "")) {
        //scan starts from root
        let args = {
            "source_id": scan_started_data.source_id,
            "folder_id": undefined,
            "offset": _offset,
            "limit": _limit
        }
        list_dir(args, (err, data) => {
            if (data && data.data.list.length > 0) {
                data.data.list.forEach(function (root_folder) {
                    list_dir_loop(scan_started_data, root_folder.id, root_folder.name, _offset, _limit);
                });
            }
        });

    } else {
        //scan starts from a specific folder
        logger.info("Starting scanning from a specific folder...", folder_id, folder_name);
        list_dir_loop(scan_started_data, folder_id, folder_name, _offset, _limit);
    }
}

async function list_dir_loop(scan_started_data, folder_id, folder_name, offset, limit) {
    logger.info(`01-Getting sub folder ${folder_id}...`);
    let args = {
        "source_id": scan_started_data.source_id,
        "folder_id": folder_id,
        "offset": offset,
        "limit": limit
    }

    list_dir(args, (err, data) => {
        if (data) {
            if (data.data.list.length > 0) {
                data.data.list.forEach(function (folder) {
                    logger.info(`02-Getting sub folder ${folder.id} of folder ${folder_id}...`);
                    list_dir_loop(scan_started_data, folder.id, folder.name, offset, limit);
                });
            } else {
                logger.info(`Getting photos from ${folder_id}-${folder_name}...`);
                let args = {
                    "source_id": scan_started_data.source_id,
                    "folder_id": folder_id,
                    "offset": offset,
                    "limit": limit
                }
                list_dir_items(args, (err, photo_data) => {
                    if (photo_data) {
                        photo_data.data.list.forEach(function (photo) {
                            let one_record = {
                                "source_id": scan_started_data.source_id,
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
                            "scan_log_id": scan_started_data.scan_log_id
                        }
                        save_scan_log_detail(scan_failed_data);
                    }
                });
            }
        } else {
            logger.info("Server resource exhausted. Cooling down for 5 seconds...");
            let scan_failed_data = {
                "folder_id": folder_id,
                "folder_name": folder_name,
                "info": "",
                "scan_log_id": scan_started_data.scan_log_id
            }
            save_scan_log_detail(scan_failed_data);
        }
    });
}

function scan_failed_folders(scan_log_end_data) {
    _failed_folders_tried = true;
    get_scan_log_detail(scan_log_end_data.id, undefined, (err, rows) => {
        if (err) {
            logger.error(err);
        } else {
            if (rows && rows.length > 0) {
                rows.forEach(function (row) {
                    logger.info(`Retrying failed folders: ${row.folder_id}: ${row.folder_name}`);
                    list_dir_loop(scan_log_end_data, row.folder_id, row.folder_name, _offset, _limit);
                    update_scan_log(scan_log_end_data, row.folder_id, 1);
                });
            }
        }
    });
}


function syno_scanning_ended(err, scan_log_end_data) {
    if (!_failed_folders_tried) {
        logger.info("Started secondary scans (retrying failed folders)...");
        scan_failed_folders(scan_log_end_data);
    } else {
        _failed_folders_tried = true;
        //another end is required, we need to update total count after failed folders
    }
}
