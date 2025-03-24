import logger from "../config_log.js";
import { meta_db } from "./meta_base.mjs";
import { encrypt, decrypt } from "./encrypt.js";



export function create_or_update(source, callback) {
    let query = `select * from source where name = ? COLLATE NOCASE`;
    if (source.password)
        source.password = encrypt(source.password);
    if (source.config)
        source.config = encrypt(JSON.stringify(source.config));
    if (source.cache)
        source.cache = encrypt(JSON.stringify(source.cache));

    meta_db.get(query, [source.name],
        (err, meta_source) => {
            if (err) {
                logger.error(err.message);
            } else {
                if (!meta_source) {
                    meta_db.run(
                        `INSERT INTO source (name, type, url, user, password, config) VALUES (?, ?, ?, ?, ?, ?)`,
                        [source.name, source.type, source.url, source.user, source.password, source.config],
                        function (err) {
                            if (err) {
                                logger.error('Error inserting data:', err);
                                callback(err, null, 500);
                            } else {
                                source["id"] = this.lastID;
                                callback(null, source, 201);
                            }
                        });
                } else {
                    meta_db.run(
                        `UPDATE source set url = ?, user = ?, password = ?, config = ?, cache = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') where name = ?`,
                        [source.url, source.user, source.password, source.config, undefined, source.name],
                        function (err) {
                            if (err) {
                                logger.error('Error updating data:', err);
                                callback(err, null, 500);
                            } else {
                                source["id"] = meta_source.id;
                                callback(null, source, 200);
                            }
                        });
                }
            }
        });
}

export function update_cache(source, callback) {
    let plan_text_cache = source.cache;
    if (source.cache)
        source.cache = encrypt(JSON.stringify(source.cache));

    let query = `select * from source where name = ? COLLATE NOCASE`;
    meta_db.get(query, [source.name],
        (err, meta_source) => {
            if (err) {
                logger.error(err.message);
            } else {
                if (meta_source) {
                    meta_db.run(
                        `UPDATE source set [cache] = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') where name = ?`,
                        [source.cache, source.name],
                        function (err) {
                            if (err) {
                                logger.error('Error updating data:', err);
                                callback(err, null, 500);
                            } else {
                                meta_source["cache"] = plan_text_cache;
                                callback(null, meta_source, 200);
                            }
                        });
                } else {
                    callback(null, null);
                }
            }
        });
}


export function list(callback) {
    let query = `select * from source`;
    meta_db.all(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

export function get(id, decrypt_value, callback) {
    const try_id = parseInt(id);
    let query = `select * from source where id = ?`;
    if (isNaN(try_id))
        query = `select * from source where name = ? COLLATE NOCASE`;
    meta_db.get(query, [id],
        (err, source) => {
            if (err) {
                logger.error(err.message);
                callback(err, null);
            } else if (source && (source.config != null || source.config != "")) {
                if (decrypt_value) {                    
                    source.password = source.password ? decrypt(source.password) : source.password;
                    source.cache = source.cache ? decrypt(source.cache) : source.cache;
                    source.config = source.config ? decrypt(source.config) : source.config;
                    source.config = source.config ? JSON.parse(source.config) : source.config;
                }
                callback(null, source);
            }
        });
}

export function clear_cache(id, callback) {
    const try_id = parseInt(id);
    let query = `select * from source where id = ?`;
    if (isNaN(try_id))
        query = `select * from source where name = ? COLLATE NOCASE`;
    meta_db.get(query, [id],
        (err, source) => {
            if (err) {
                logger.error(err.message);
                callback(err, null);
            } else {
                if (source) {
                    meta_db.run(
                        `UPDATE source set [cache] = null, updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') where id = ?`,
                        [source["id"]],
                        function (err) {
                            if (err) {
                                logger.error('Error updating data:', err);
                                callback(err, null, 500);
                            } else {
                                source["cache"] = undefined;
                                callback(null, source, 200);
                            }
                        });
                } else {
                    callback(null, null);
                }
            }
        });
}

export function save_source_dir(dir_data, callback) {
    //console.log(dir_data);
    let query = `select * from source_dir where dir_name = ? COLLATE NOCASE`;

    meta_db.get(query, [dir_data.dir_name],
        (err, meta_dir_data) => {
            if (err) {
                logger.error(err.message);
            } else {
                if (!meta_dir_data) {
                    meta_db.run(
                        `INSERT INTO source_dir (dir_id, dir_name, parent_id, source_id) VALUES (?, ?, ?, ?)`,
                        [dir_data.dir_id, dir_data.dir_name, dir_data.parent_id, dir_data.source_id],
                        function (err) {
                            if (err) {
                                logger.error('Error inserting data:', err);
                                callback(err, null);
                            } else {
                                dir_data["id"] = this.lastID;
                               callback(null, dir_data);
                            }
                        });
                } else {
                    callback(null, dir_data);
                    // meta_db.run(
                    //     `UPDATE source_dir set dir_id = ?, dir_name = ?, parent_id = ?, source_id = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') where id = ?`,
                    //     [dir_data.dir_id, dir_data.dir_name, dir_data.parent_id, dir_data.source_id, meta_dir_data.id],
                    //     function (err) {
                    //         if (err) {
                    //             logger.error('Error updating data:', err);
                    //             callback(err, null);
                    //         } else {
                    //             dir_data["id"] = meta_dir_data.id;
                    //             callback(null, dir_data);
                    //         }
                    //     });
                }
            }
        });
}

export function get_source_dir(dir_id, callback) {
    let query = `select * from source_dir where dir_id = ?`;

    meta_db.get(query, [dir_id],
        (err, meta_dir_data) => {
            if (err) {
                logger.error(err.message);
            } else {
                if (meta_dir_data) {                    
                    callback(null, meta_dir_data);                    
                }else{
                    callback({"message": "Not found"}, null);
                }
            }
        });
}

export function get_dirs(source_id, limit, offset, callback) {
    limit = parseInt(limit) || 30;
    offset = parseInt(offset) || 0;
    
    meta_db.get("select count(DISTINCT folder_name) as count from photo where source_id = ?",
        [source_id], (err, row) => {
            if (err) {
                callback(err, null);
            }
            let total_records = row.count;
            let total_pages = Math.ceil(total_records / limit);
            let query = `select folder_id as dir_id, folder_name as dir, count(photo_id) as photos 
                from photo
                where source_id = ?
                group by folder_name
                ORDER BY folder_name DESC LIMIT ? OFFSET ?`;
            meta_db.all(query, [source_id, limit, offset], (err, rows) => {
                if (err) {
                    logger.error(err.message);
                    callback(err, null);
                } else {
                    callback(null, {
                        total_records: total_records,
                        total_pages: total_pages,
                        current_offset: offset,
                        limit: limit,
                        records: rows
                    });
                }
            });
        });
}

export function get_photos_of_a_dir(source_id, dir_id, offset, limit, callback) {
    limit = parseInt(limit) || 10;
    offset = parseInt(offset) || 0;

    meta_db.get("SELECT COUNT(*) as count from photo where folder_id = ? and source_id = ?",
        [dir_id, source_id], (err, row) => {
        if (err) {
            callback(err, null);
        }
        let total_records = row.count;
        let total_pages = Math.ceil(total_records / limit);

        meta_db.all(`SELECT photo_id, source_id, s.type as source_type, s.url, filename, folder_name, cache_key 
            FROM photo p
            inner join source s on s.id = p.source_id 
            WHERE folder_id = ? and source_id = ? LIMIT ? OFFSET ?`, 
            [dir_id, source_id, limit, offset],
            (err, rows) => {
                if (err) {
                    logger.error(err.message);
                    callback(err, null);
                } else {
                    callback(null, {
                        total_records: total_records,
                        total_pages: total_pages,
                        current_offset: offset,
                        limit: limit,
                        records: rows
                    });
                }
        });
    });
}