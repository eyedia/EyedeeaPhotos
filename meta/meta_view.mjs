import sqlite3 from "sqlite3";
import fs from "fs";
import config_log from "../config_log.js";
import { meta_db, get_rows } from "./meta_base.mjs";
import { search } from "./meta_search.mjs";

const logger = config_log.logger;

export function get_random_photo(callback) {
    let query = `select * from photo where photo_id in (SELECT photo_id FROM view_log WHERE current = 1)`;
    //let query = "SELECT * FROM photo WHERE id IN(35001,38543,40368)";
    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            if (rows.length >= 1) {
                rows[0].address = JSON.parse(JSON.stringify(rows[0].address));
                if (rows[0].status == 1) {
                    //already picked up, return the records                    
                    callback(null, rows);
                } else {
                    //update that the photo has been picked_up
                    meta_db.run(
                        `UPDATE view_log set status = 1 where photo_id = ?`,
                        [rows[0].photo_id],
                        function (err) {
                            if (err) {
                                logger.error('Error updating data:', err);
                            } else {
                                callback(null, rows);
                            }
                        });
                }
            } else {
                logger.error("Fatal error! No photo was set to current. This issue was taken care for the next cycle.");
                 
                //This case occurred only once, when view_log had a photo_id which never existed in the photo table.
                //if can clear all non existent photo_id from the view_log, we should be good.
                 meta_db.run(
                    `delete from view_log where photo_id not in (select photo_id from photo)`,
                    [],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                        } else {
                            set_current_photo((err, rows) => {
                                if (err) {
                                    callback(err, null);
                                }else{
                                    callback(null, rows);
                                }
                            });
                            
                        }
                    });
            }

        }
    });
}

export function get_photo_history(callback) {
    let query = `select * from photo 
                    inner join view_log on view_log.photo_id = photo.photo_id 
                    order by update_sequence desc limit 12`;
    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            rows.forEach(row => {
                if (row.address != null) {
                    row.address = JSON.parse(JSON.stringify(row.address));
                }
            });
            callback(null, rows);
        }
    });
}

export function set_random_photo() {
    
    let number_of_already_set_photos = 0;
    get_rows("select count(*) as cnt from view_log where status = 0", (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 1) {
                number_of_already_set_photos = rows[0]["cnt"];
            }
        }        
        if (number_of_already_set_photos < 25) {
            let query = "";
            search((err, view_filter_id, photo_ids) => {
                if (err) {
                    logger.error(err);
                } else {                    
                    if (photo_ids) {
                        //filtered random
                        query = `SELECT * FROM photo WHERE id IN (SELECT id FROM photo WHERE type='photo' and photo_id in (${photo_ids}) ORDER BY RANDOM() LIMIT 1000)`;
                    } else {                        
                        //default random
                        query = `SELECT * FROM photo WHERE id IN (SELECT id FROM photo WHERE type='photo' ORDER BY RANDOM() LIMIT 1000)`;
                    }
                }

                get_rows(query, (err, random_photos) => {
                    if (err) {
                        logger.error(err.message);
                    } else {
                        random_photos.forEach((random_photo) => {
                            query = `SELECT * FROM view_log WHERE photo_id = ${random_photo.photo_id}`
                            get_rows(query, (err, rows) => {
                                if (err) {
                                    logger.error(err.message);
                                } else {
                                    if (rows.length == 0) {
                                        meta_db.run(
                                            `INSERT INTO view_log (photo_id, view_filter_id) VALUES (?, ?)`,
                                            [random_photo.photo_id, view_filter_id],
                                            function (err) {
                                                if (err) {
                                                    logger.error('Error inserting data:', err);
                                                }
                                            });
                                    } else {
                                        random_photo["count"] = rows[0].count;
                                        meta_db.run(
                                            `UPDATE view_log set status = 0, count = ?, view_filter_id = ?, updated_at = ? where photo_id = ?`,
                                            [random_photo.count + 1, view_filter_id, Date.now(), random_photo.photo_id],
                                            function (err) {
                                                if (err) {
                                                    logger.error('Error updating data:', err);
                                                }
                                            });
                                    }
                                }
                            });
                        });
                    }
                });

            });
        } else {
            logger.info(`${number_of_already_set_photos} random photos are waiting to be picked up, not setting any new!`);
        }

        set_current_photo((err, rows) => {
            if (err) {
                logger.error(err);
            }
        });

    });

}


function set_current_photo(callback) {

    meta_db.all("SELECT photo_id FROM view_log WHERE status = 0 and current = 1", (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            if (rows.length == 0) {
                let query = "SELECT * FROM photo WHERE photo_id = 203516";
                //let query = "SELECT photo_id FROM view_log WHERE status = 0 ORDER BY RANDOM() LIMIT 1";
                meta_db.all(query, (err, rows) => {
                    if (err) {
                        if(callback)
                            callback(err, null);
                    } else {
                        if (rows.length >= 1) {
                            meta_db.run(
                                `UPDATE view_log set current = 1, 
                                    update_sequence = (select max(update_sequence) + 1 from view_log),
                                    updated_at = ? 
                                    where photo_id = ?`,
                                [Date.now(), rows[0]["photo_id"]],
                                function (err) {
                                    if (err) {
                                        logger.error('Error updating data:', err);
                                    } else {
                                        meta_db.run(
                                            `UPDATE view_log set current = 0 where photo_id != ?`,
                                            [rows[0]["photo_id"]],
                                            function (err) {
                                                if (err) {
                                                    logger.error('Error updating data:', err);
                                                } else {
                                                    callback(null, null);
                                                }
                                            });
                                    }
                                });
                        } else {                            
                            if(callback)                               
                                callback({"message":"Fatal error! No random photo was set."}, null);
                        }
                    }
                });
            }else{
                logger.info("Already one photo was set to current, the operation was ignored.");
            }
        }
    });
}


export function get_tag(name, callback) {
    let query = `select * from tag where name = '${name}' COLLATE NOCASE`;
    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            if(rows.length >= 0){            
                callback(null, rows[0]);
            }else{
                callback({"message": "Something went wrong while retrieving tag from meta data!"}, null);
            }
        }
    });
}

export function get_config(callback) {
    let viewer_config = {
        "refresh_server": "* * * * *",
        "refresh_client": 70
    }
    //let query = "select * from photo where photo_id in (SELECT photo_id FROM view_log WHERE current = true LIMIT 1)";
    //let query = "SELECT * FROM photo WHERE id IN(35001,38543,40368)";
    // meta_db.all(query, (err, rows) => {
    //     if (err) {
    //         callback(err, null);
    //     } else {
    //         rows.forEach(function (row) {
    //             row.address = JSON.parse(JSON.stringify(row.address));
    //         });
    //         callback(null, rows);
    //     }
    // });
    callback(null, viewer_config)
}

