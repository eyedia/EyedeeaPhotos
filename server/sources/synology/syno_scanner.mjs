import { list_dir, list_dir_items, get_dir_details, listPersons, nas_auth_token } from "./syno_client.mjs";
import {
    save_item, save_scan_log_detail,
    get_scan_log_detail, update_scan_log,
    stop_scan as meta_stop_scan
} from "../../meta/meta_scan.mjs";

import {
    clear_cache as meta_clear_cache,
} from "../../meta/meta_source.mjs"

import { start_scanning } from '../scanner.js';
import logger from "../../config_log.js";
import { get as meta_get_scan_log } from '../../meta/meta_scan_log.mjs';

import {startInternalScanInWorker} from "./syno_scan_manager.js";


let _failed_folders_tried = false;

let _offset = 0;
let _limit = 1000;
let total_dirs = 1;
let total_photos = 0;

export async function scan(source, folder_id, inform_caller_scan_started, inform_caller_scan_ended) {
    //lets do health check before scanning
    logger.info(`========== SCAN STARTED: Source ID=${source.id}, Folder ID=${folder_id || 'ROOT'} ==========`);
    health_check(source.id, (err, data) => {
        if (err) {
            logger.error(`Health check failed for source ${source.id}:`, err);
            inform_caller_scan_started(err, null);
            return;
        } else {
            let scan_start_data = {
                source: source,
                clean_photos: folder_id ? false : true,
                max_time_in_mins: 12,
                interval_in_secs: 30,
                insert_data_threshold: 0.0005
            }            
            start_scanning(scan_start_data, (err, scan_started_data) => {
                if (err) {
                    logger.error(err);
                    inform_caller_scan_started(err, null);
                } else {
                    total_dirs = 1;
                    total_photos = 0;

                    delete nas_auth_token[scan_started_data.source_id];               
                    meta_clear_cache(scan_started_data.source_id, (err, data, status_code) => {
                        logger.info("Cleared auth cache to retrieve person data...");
                        logger.info(`Scan initiated: scan_log_id=${scan_started_data.scan_log_id}, source_id=${scan_started_data.source_id}`);
                        inform_caller_scan_started(null, scan_started_data);
                        internal_scan(scan_started_data, folder_id);                        
                        // startInternalScanInWorker(scan_started_data, folder_id)
                        // .then(console.log)
                        // .catch(console.error);
                    });
                }
            },
                syno_scanning_ended,
                inform_caller_scan_ended);
        
        }
    });
}

export async function internal_scan(scan_started_data, folder_id) {

    if (folder_id === -1) {
        //scan starts from root
        let args = {
            "source_id": scan_started_data.source_id,
            "folder_id": undefined,
            "offset": _offset,
            "limit": _limit
        }
        list_dir(args, (err, data) => {
            if (data && data.data.list.length > 0) {
                logger.info(`Found ${data.data.list.length} root folders to scan`);
                data.data.list.forEach(function (root_folder) {
                    logger.info(`Queueing root folder: ${root_folder.id} - ${root_folder.name}`);
                    list_dir_loop(scan_started_data, root_folder.id, root_folder.name, _offset, _limit);
                });
            }
        });

    } else {
        //scan starts from a specific folder
        logger.info(`Starting scanning from a specific folder... ${folder_id}`);
        let args = {
            "source_id": scan_started_data.source_id,
            "folder_id": folder_id,
            "offset": _offset,
            "limit": _limit
          }
        get_dir_details(args, (err, dir_details) => {
            if(dir_details){       
                logger.info(`Starting scanning from a specific folder... ${folder_id}, ${dir_details.dir_name}`);
                list_dir_loop(scan_started_data, folder_id, dir_details.dir_name, _offset, _limit);
            }
        });
    }
}

async function list_dir_loop(scan_started_data, folder_id, folder_name, offset, limit) {
    total_dirs++;

    // Log progress every 50 folders to avoid log spam
    if (total_dirs % 50 === 0) {
        logger.info(`Progress: ${total_dirs} folders processed, ${total_photos} photos found so far`);
    }

    let args = {
        "source_id": scan_started_data.source_id,
        "folder_id": folder_id,
        "offset": offset,
        "limit": limit
    }

    list_dir(args, (err, data) => {
        if (data) {            
            if (data.data.list.length > 0) {
                logger.debug(`Folder ${folder_id} (${folder_name}) has ${data.data.list.length} subfolders`);
                data.data.list.forEach(function (folder) {
                    list_dir_loop(scan_started_data, folder.id, folder.name, offset, limit);
                });
            } else {                
                logger.debug(`Leaf folder found: ${folder_id} (${folder_name}) - fetching photos...`);
                let args = {
                    "source_id": scan_started_data.source_id,
                    "folder_id": folder_id,
                    "offset": offset,
                    "limit": limit
                }
                
                list_dir_items(args, (err, photo_data) => {                    
                    if (photo_data) {
                        const photo_count = photo_data.data.list.length;
                        if (photo_count > 0) {
                            logger.info(`Processing ${photo_count} photos from folder: ${folder_name} (ID: ${folder_id})`);
                        }
                        photo_data.data.list.forEach(function (photo) {
                            total_photos++;
                            // Log every 500 photos to track progress
                            if (total_photos % 500 === 0) {
                                logger.info(`Photo milestone: ${total_photos} photos processed (Folder: ${folder_name})`);
                            }
                            const persons =  photo.additional.person.map(p => p.name).join(",");                          
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
                                "persons": persons,
                                "geocoding_id": photo.additional.geocoding_id,
                                "tags": photo.additional.tag.map(t => t.name).join(","),
                                "address": JSON.stringify(photo.additional.address)
                            }
                            save_item(one_record);
                        });
                    } else {
                        logger.warn(`API timeout/failure for folder ${folder_id} (${folder_name}) - added to retry list`);
                        let scan_failed_data = {
                            "folder_id": folder_id,
                            "folder_name": folder_name,
                            "scan_log_id": scan_started_data.scan_log_id
                        }
                        save_scan_log_detail(scan_failed_data);
                    }
                });
            }
        } else {
            logger.warn(`API failure listing folder ${folder_id} (${folder_name}) - added to retry list. Error: ${err || 'unknown'}`);
            let scan_failed_data = {
                "folder_id": folder_id,
                "folder_name": folder_name,
                "scan_log_id": scan_started_data.scan_log_id
            }
            save_scan_log_detail(scan_failed_data);
        }
    });
}

function scan_failed_folders(scan_log_end_data) {
    _failed_folders_tried = true;
    logger.info(`Checking for failed folders to retry...`);
    get_scan_log_detail(scan_log_end_data.id, undefined, (err, rows) => {
        if (err) {
            logger.error('Error getting scan log details:', err);
        } else {
            if (rows && rows.length > 0) {
                logger.info(`Found ${rows.length} failed folders to retry`);
                rows.forEach(function (row) {
                    logger.info(`Retrying failed folder: ${row.folder_id} (${row.folder_name})`);
                    list_dir_loop(scan_log_end_data, row.folder_id, row.folder_name, _offset, _limit);

                    logger.info(`updating re-scanning result: ${scan_log_end_data.id}, ${row.folder_id}`);
                    update_scan_log(scan_log_end_data.id, row.folder_id, 1);
                });
            }
        }
    });
}


function syno_scanning_ended(err, scan_log_end_data, inform_caller_scan_ended) {
    logger.info(`========== SCAN PHASE COMPLETED: Total Dirs=${total_dirs}, Total Photos=${total_photos} ==========`);
    
    if (!_failed_folders_tried) {        
        get_scan_log_detail(scan_log_end_data.id, undefined, (err, rows) => {
            if (err) {
                logger.error('Error in syno_scanning_ended:', err);
            } else {
                if (rows && rows.length > 0) {
                    logger.info(`First scan round completed. Starting retry phase for ${rows.length} failed folders...`);
                    logger.info(`Stats after 1st round - Recorded: ${scan_log_end_data.total_dirs} dirs, Found: ${total_dirs} dirs, ${total_photos} photos`);
                    syno_start_failed_folders(scan_log_end_data, inform_caller_scan_ended);
                }
            }
        });
        
    } else {
        logger.info(`========== FULL SCAN COMPLETED ==========`);
        logger.info(`Final Stats - Total Dirs: ${total_dirs}, Total Photos: ${total_photos}`);
        logger.info(`Stats after 2nd round - Recorded: ${scan_log_end_data.total_dirs} dirs, Found: ${total_dirs} dirs, ${total_photos} photos`);
        _failed_folders_tried = true;
        scan_log_end_data.total_dirs = total_dirs;
        scan_log_end_data.total_photos = total_photos;
        meta_stop_scan(scan_log_end_data);
        if (inform_caller_scan_ended)
            inform_caller_scan_ended(scan_log_end_data);
    }
}

export function syno_start_failed_folders(scan_log_end_data, inform_caller_scan_ended) {

    let scan_start_data = {
        source: scan_log_end_data.source,
        scan_log_id: scan_log_end_data.id,
        max_time_in_mins: 12,
        interval_in_secs: 30,
        insert_data_threshold: 0.0005
    }
    start_scanning(scan_start_data, (err, scan_started_data) => {
        if (err) {
            logger.error(err);
        } else {
            scan_failed_folders(scan_log_end_data);
        }
    },
        syno_scanning_ended,
        inform_caller_scan_ended);
}

async function health_check(source_id, callback) {
    let args = {
        "source_id": source_id,
        "folder_id": undefined,
        "offset": _offset,
        "limit": _limit
    }
    list_dir(args, (err, data) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, data);
        }
    });
}
