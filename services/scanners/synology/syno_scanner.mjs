import { list_dir, list_dir_items } from "./syno_client.mjs"
import { save_item, start_scan, stop_scan, save_scan_log_detail, get_scan_log_detail, update_scan_log } from "../../../meta/meta_scan.mjs"
import config_log from "../../../config_log.js";

const logger = config_log.logger;

export async function scan(folder_id = -1, folder_name = "") {

    let m_offset = 0;
    let m_limit = 1000;

    //save scan log
    let scan_log_data = {
        "root_folder_id": folder_id,
        "root_folder_name": folder_name,
        "info": ""
    }

    start_scan(scan_log_data, (err, scan_log_id) => {
        if (err) {
            logger.error(err.message);
        } else {
            if ((folder_id === -1) && (folder_name === "")) {
                let info = "";
                //scan starts from root
                list_dir(undefined, m_offset, m_limit)
                    .then(data => {
                        if (data && data.data.list.length > 0) {
                            let remaining_folders = data.data.list.length;
                            info = "Total root folders:" + remaining_folders;
                            data.data.list.forEach(function (root_folder) {
                                list_dir_loop(scan_log_id, root_folder.id, root_folder.name, m_offset, m_limit);
                            },
                                function () {
                                    remaining_folders--;
                                    console.log(remaining_folders);
                                    if (remaining_folders <= 0) {
                                        logger.info("Primary scanning finished. Checking failed folders...");

                                        //ensure that failed(timed out) folders are scanned
                                        get_scan_log_detail(scan_log_id, undefined, (err, rows) => {
                                            if (err) {
                                                logger.error(err);
                                            } else {
                                                if (rows && rows.length > 0) {
                                                    let remaining_failed_folders = rows.length;
                                                    info = info + ", Total failed folders:" + remaining_failed_folders;
                                                    rows.forEach(function (row) {
                                                        logger.info(`Retrying failed folders: ${row.folder_id}: ${row.folder_name}`);
                                                        list_dir_loop(scan_log_id, row.folder_id, row.folder_name, m_offset, m_limit);
                                                        update_scan_log(scan_log_id, row.folder_id, 1);
                                                    },
                                                        function () {
                                                            remaining_failed_folders--;
                                                            if (remaining_failed_folders <= 0) {
                                                                logger.info("Scan completed successfully!");
                                                                let scan_log_end_data = {
                                                                    "id": scan_log_id,
                                                                    "info": info
                                                                }
                                                                stop_scan(scan_log_end_data);
                                                            }
                                                        });
                                                } else {
                                                    logger.info("Scan completed successfully!");
                                                    info = info + ", Total failed folders:0";
                                                    let scan_log_end_data = {
                                                        "id": scan_log_id,
                                                        "info": info
                                                    }
                                                    stop_scan(scan_log_end_data);
                                                }
                                            }
                                        });
                                    }
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