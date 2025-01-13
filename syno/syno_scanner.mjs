import { list_dir } from "./syno_client.mjs"
import { save_photo, scan_log } from "../meta/metadata.mjs"
import config_log from "../config_log.js";

const logger = config_log.logger;

export async function scan() {

    let m_offset = 0;
    let m_limit = 100;

    list_dir(undefined, undefined, m_offset, m_limit)
        .then(data => {
            data.data.list.forEach(function (root_folder) {
                list_dir_loop(root_folder.id, root_folder.name, undefined, m_offset, m_limit);
            });
        });
    logger.info("Scan completed successfully!")
}

async function list_dir_loop(id = -1, id_name, folder_id = -1, offset = 0, limit = 100) {
    logger.info(`01-Getting sub folder ${id}...`);
    list_dir(id, folder_id, offset, limit)
        .then(data => {
            if (data.data.list.length > 0) {
                data.data.list.forEach(function (folder) {
                    logger.info(`02-Getting sub folder ${folder.id} of folder ${id}...`);
                    list_dir_loop(folder.id, folder.name, undefined, offset, limit);
                });
            } else {
                logger.info(`Getting photos from ${id}-${id_name}...`);
                list_dir(-1, id, offset, limit)
                    .then(photo_data => {
                        if (photo_data) {
                            photo_data.data.list.forEach(function (photo) {
                                let one_record = {
                                    "photo_id": photo.id,
                                    "filename": photo.filename,
                                    "folder_id": photo.folder_id,
                                    "folder_name": id_name,
                                    "time": photo.time,
                                    "type": photo.type,
                                    "orientation": photo.additional.orientation,
                                    "cache_key": photo.additional.thumbnail.cache_key,
                                    "unit_id": photo.additional.thumbnail.unit_id,
                                    "geocoding_id": photo.additional.geocoding_id
                                }
                                save_photo(one_record);
                            });
                        } else {
                            logger.info("Server resource exhausted. Cooling down for 5 seconds...");
                            let scan_failed_data = {
                                "folder_id": id,
                                "folder_name": id_name,
                                "debug_info": "debug info, blah"
                            }
                            scan_log(scan_failed_data);
                            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
                        }
                    });
            }
        });
}