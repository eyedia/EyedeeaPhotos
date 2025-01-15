import { list_dir, list_dir_items } from "./syno_client.mjs"
import { save_photo, scan_log, get_scan_failed_folders, update_scan_failed_folder } from "../meta/metadata.mjs"
import config_log from "../config_log.js";

const logger = config_log.logger;

export async function scan(folder_id = -1, folder_name = "") {

    let m_offset = 0;
    let m_limit = 1000;

    if ((folder_id === -1) && (folder_name === "")) {
        //scan starts from root
        list_dir(undefined, m_offset, m_limit)
            .then(data => {
                data.data.list.forEach(function (root_folder) {
                    list_dir_loop(root_folder.id, root_folder.name, m_offset, m_limit);
                });
                //logger.info("Scan completed successfully!");                
            });

        //ensure that failed(timed out) folders are scanned
        get_scan_failed_folders((err, rows) => {
            if (err) {
                logger.error(err);
            } else {
                rows.forEach(function (row) {                    
                    logger.info(`Retrying failed folders: ${row.folder_id}: ${row.folder_name}`);
                    list_dir_loop(row.folder_id, row.folder_name, m_offset, m_limit);
                    update_scan_failed_folder(row.folder_id, 1);
                });
            }
        });
    } else {
        //scan starts from a specific folder
        logger.info("Starting scanning from a specific folder...", folder_id, folder_name);
        list_dir_loop(folder_id, folder_name, m_offset, m_limit);
    }
}

async function list_dir_loop(folder_id, folder_name, offset, limit) {
    logger.info(`01-Getting sub folder ${folder_id}...`);
    list_dir(folder_id, offset, limit)
        .then(async data => {
            if (data) {
                if (data.data.list.length > 0) {
                    data.data.list.forEach(function (folder) {
                        logger.info(`02-Getting sub folder ${folder.id} of folder ${folder_id}...`);
                        list_dir_loop(folder.id, folder.name, offset, limit);
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
                                    save_photo(one_record);
                                });
                            } else {
                                logger.info("Server resource exhausted. Cooling down for 5 seconds...");
                                let scan_failed_data = {
                                    "folder_id": folder_id,
                                    "folder_name": folder_name,
                                    "debug_info": "debug info, blah"
                                }
                                scan_log(scan_failed_data);
                                await wait(5000);
                            }
                        });
                }
            } else {
                logger.info("Server resource exhausted. Cooling down for 5 seconds...");
                let scan_failed_data = {
                    "folder_id": folder_id,
                    "folder_name": folder_name,
                    "debug_info": ""
                }
                scan_log(scan_failed_data);
                await wait(5000);
            }
        });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}