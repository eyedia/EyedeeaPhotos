import sqlite3 from "sqlite3";
import fs from "fs";
import logger from "../config_log.js";
import { meta_db } from "./meta_base.mjs";
import { search } from "./meta_search.mjs";


export function get_photo(photo_id, callback) {
    let query = `select p.id, p.source_id, p.photo_id, p.filename, p.folder_id, p.folder_name, 
                p.time, p.type, p.orientation, p.cache_key, p.tags, p.address, s.type as 'source_type'
                from photo p
                inner join source s on p.source_id = s.id
                where p.photo_id = ?`;
    meta_db.get(query, [photo_id], (err, photo) => {
        if (err) {
            callback(err, null);
        } else {            
            if(photo && photo.address)
                photo.address = JSON.parse(JSON.stringify(photo.address));                             
            callback(null, photo);
        }
    });
}

export function get_random_photo(callback) {
    // Always fetch the current photo directly from view_log to avoid stale picks
    const query = `
        SELECT p.id, p.source_id, p.photo_id, p.filename, p.folder_id, p.folder_name,
               p.time, p.type, p.orientation, p.cache_key, p.tags, p.address,
               s.type AS source_type, vl.status, vl.current
        FROM view_log vl
        INNER JOIN photo p ON p.photo_id = vl.photo_id
        INNER JOIN source s ON p.source_id = s.id
        WHERE vl.current = 1
        ORDER BY vl.update_sequence DESC
        LIMIT 1`;

    meta_db.get(query, (err, row) => {
        if (err) {
            callback(err, null);
            return;
        }

        if (row) {
            if (row.address) {
                row.address = JSON.parse(JSON.stringify(row.address));
            }

            // Mark as picked-up (status = 1)
            meta_db.run(
                `UPDATE view_log SET status = 1 WHERE photo_id = ?`,
                [row.photo_id],
                (updateErr) => {
                    if (updateErr) {
                        logger.error('Error updating view_log status:', updateErr);
                    }
                    callback(null, [row]);
                }
            );
        } else {
            logger.error("Fatal error! No photo was set to current. Attempting recovery by clearing invalid entries and re-setting current.");

            meta_db.run(
                `DELETE FROM view_log WHERE photo_id NOT IN (SELECT photo_id FROM photo)`,
                [],
                (cleanupErr) => {
                    if (cleanupErr) {
                        logger.error('Error during cleanup of view_log:', cleanupErr);
                        callback(cleanupErr, null);
                        return;
                    }
                    set_current_photo((setErr, rows) => {
                        if (setErr) {
                            callback(setErr, null);
                        } else {
                            callback(null, rows);
                        }
                    });
                }
            );
        }
    });
}

export function get_photo_history(limit, callback) {
    if(!limit)
        limit = 12;

    let query = `select p.id, p.source_id, p.photo_id, p.filename, p.folder_id, p.folder_name, 
                p.time, p.type, p.orientation, p.cache_key, p.tags, p.address, s.type as 'source_type'
                from photo p
                inner join source s on p.source_id = s.id
                inner join view_log vl on vl.photo_id = p.photo_id 
                order by update_sequence desc limit ?`;
    meta_db.all(query, [limit], (err, rows) => {
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
    meta_db.get("select count(*) as cnt from view_log where status = 0", (err, count_data) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (count_data) {
                number_of_already_set_photos = count_data["cnt"];
            }
        }        
        if (number_of_already_set_photos < 25) {
            let query = "";
            search((err, view_filter_id, photo_ids) => {
                //console.log(err, view_filter_id, photo_ids);
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
                meta_db.all(query, [], (err, random_photos) => {
                    if (err) {
                        logger.error(err.message);
                    } else {
                        random_photos.forEach((random_photo) => {
                            query = `SELECT * FROM view_log WHERE photo_id = '${random_photo.photo_id}'`
                            meta_db.all(query, [], (err, rows) => {
                                if (err) {
                                    logger.error(err);
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
                                            `UPDATE view_log set status = 0, count = ?, view_filter_id = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') where photo_id = ?`,
                                            [random_photo.count + 1, view_filter_id, random_photo.photo_id],
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
            logger.debug(`${number_of_already_set_photos} random photos are waiting to be picked up, not setting any new!`);
        }

        set_current_photo((err, rows) => {
            if (err) {
                logger.error(err);
            }
        });

    });

}


function set_current_photo(callback) {
    // Always rotate to a new current photo on each invocation.
    // Pick a random candidate from the pool of not-yet-picked (status = 0).
    const pickQuery = "SELECT photo_id FROM view_log WHERE status = 0 ORDER BY RANDOM() LIMIT 1";
    meta_db.all(pickQuery, (err, rows) => {
        if (err) {
            if (callback) callback(err, null);
            return;
        }

        if (rows.length >= 1) {
            const newPhotoId = rows[0]["photo_id"];

            // Promote the new photo to current and reset its status to 0 (waiting/displayable)
            meta_db.run(
                `UPDATE view_log SET current = 1, status = 0,
                 update_sequence = (SELECT ifnull(max(update_sequence),0) + 1 FROM view_log),
                 updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now')
                 WHERE photo_id = ?`,
                [newPhotoId],
                function (updateErr) {
                    if (updateErr) {
                        logger.error('Error updating data:', updateErr);
                        if (callback) callback(updateErr, null);
                        return;
                    }

                    // Demote any other photo from current.
                    meta_db.run(
                        `UPDATE view_log SET current = 0 WHERE photo_id != ?`,
                        [newPhotoId],
                        function (demoteErr) {
                            if (demoteErr) {
                                logger.error('Error updating data:', demoteErr);
                                if (callback) callback(demoteErr, null);
                            } else {
                                if (callback) callback(null, null);
                            }
                        }
                    );
                }
            );
        } else {
            // No candidate with status = 0. Try to reset statuses to allow rotation again.
            // This can happen if all photos have been marked picked (status = 1).
            meta_db.run(
                `UPDATE view_log SET status = 0 WHERE status = 1`,
                [],
                function (resetErr) {
                    if (resetErr) {
                        logger.error('Error resetting statuses:', resetErr);
                        if (callback) callback(resetErr, null);
                        return;
                    }
                    // Retry once after resetting statuses.
                    meta_db.all(pickQuery, (retryErr, retryRows) => {
                        if (retryErr) {
                            if (callback) callback(retryErr, null);
                            return;
                        }
                        if (retryRows.length >= 1) {
                            const newPhotoIdRetry = retryRows[0]["photo_id"];
                            meta_db.run(
                                `UPDATE view_log SET current = 1, status = 0,
                                 update_sequence = (SELECT ifnull(max(update_sequence),0) + 1 FROM view_log),
                                 updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now')
                                 WHERE photo_id = ?`,
                                [newPhotoIdRetry],
                                function (updateErr2) {
                                    if (updateErr2) {
                                        logger.error('Error updating data:', updateErr2);
                                        if (callback) callback(updateErr2, null);
                                        return;
                                    }
                                    meta_db.run(
                                        `UPDATE view_log SET current = 0 WHERE photo_id != ?`,
                                        [newPhotoIdRetry],
                                        function (demoteErr2) {
                                            if (demoteErr2) {
                                                logger.error('Error updating data:', demoteErr2);
                                                if (callback) callback(demoteErr2, null);
                                            } else {
                                                if (callback) callback(null, null);
                                            }
                                        }
                                    );
                                }
                            );
                        } else {
                            if (callback) callback({ message: "Fatal error! No random photo was set." }, null);
                        }
                    });
                }
            );
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

