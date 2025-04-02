import { list_dir, list_dir_items, get_dir_details, listPersons } from "./syno_client.mjs";
import {
    save_item, save_scan_log_detail,
    get_scan_log_detail, update_scan_log,
    stop_scan as meta_stop_scan
} from "../../meta/meta_scan.mjs";
import { start_scanning } from '../scanner.js';
import logger from "../../config_log.js";
import { get as meta_get_scan_log } from '../../meta/meta_scan_log.mjs';


let _failed_folders_tried = false;

let _offset = 0;
let _limit = 1000;
let total_dirs = 1;
let total_photos = 0;

export async function scan(source, folder_id, inform_caller_scan_started, inform_caller_scan_ended) {
    //lets do health check before scanning
    health_check(source.id, (err, data) => {
        if (err) {
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

                    let args = {
                        "source_id": scan_started_data.source_id,                        
                        "offset": 0,
                        "limit": 1000
                    }                    
                    listPersons(args, (err, persons) => {
                        inform_caller_scan_started(null, scan_started_data);
                        internal_scan(scan_started_data, folder_id);
                    });
                }
            },
                syno_scanning_ended,
                inform_caller_scan_ended);
        
        }
    });
}

async function internal_scan(scan_started_data, folder_id) {

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
                data.data.list.forEach(function (root_folder) {
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
                            total_photos++;
                            const persons =  photo.additional.person.map(p => p.name).join(",");
                            if(photo.folder_id == 1077){
                                console.log("XXXXXXXXXXXXXXXXX");
                                console.log(photo);
                                console.log(persons);
                                console.log("XXXXXXXXXXXXXXXXX");

                            }
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
                        logger.info("Server did not respond on time, added to the retry directories...");
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
            logger.info("Server resource exhausted. Cooling down for 5 seconds...");
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
    get_scan_log_detail(scan_log_end_data.id, undefined, (err, rows) => {
        if (err) {
            logger.error(err);
        } else {
            if (rows && rows.length > 0) {
                rows.forEach(function (row) {
                    logger.info(`Retrying failed folders: ${row.folder_id}: ${row.folder_name}`);
                    list_dir_loop(scan_log_end_data, row.folder_id, row.folder_name, _offset, _limit);

                    logger.info(`updating re-scanning result: ${scan_log_end_data.id}, ${row.folder_id}`);
                    update_scan_log(scan_log_end_data.id, row.folder_id, 1);
                });
            }
        }
    });
}


function syno_scanning_ended(err, scan_log_end_data, inform_caller_scan_ended) {
    if (!_failed_folders_tried) {        
        get_scan_log_detail(scan_log_end_data.id, undefined, (err, rows) => {
            if (err) {
                logger.error(err);
            } else {
                if (rows && rows.length > 0) {
                    logger.info("Started secondary scans (retrying failed folders)...");
                    console.log("After 1st round scan:", scan_log_end_data.total_dirs, total_dirs, total_photos);
                    syno_start_failed_folders(scan_log_end_data, inform_caller_scan_ended);
                }
            }
        });
        
    } else {
        console.log("After 2nd round scan:", scan_log_end_data.total_dirs, total_dirs, total_photos);
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
