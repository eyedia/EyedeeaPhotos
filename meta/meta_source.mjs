import config_log from "../config_log.js";
import { meta_db } from "./meta_base.mjs";
import { encrypt, decrypt } from "./encrypt.js";

const logger = config_log.logger;

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
                        `UPDATE source set url = ?, user = ?, password = ?, config = ?, cache = ?, updated_at = ? where name = ?`,
                        [source.url, source.user, source.password, source.config, undefined, Date.now(), source.name],
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
                        `UPDATE source set [cache] = ?, updated_at = ? where name = ?`,
                        [source.cache, Date.now(), source.name],
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
                    source.config = source.config ? JSON.parse(decrypt(source.config)) : source.config;
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
                        `UPDATE source set [cache] = null, updated_at = ? where id = ?`,
                        [Date.now(), source["id"]],
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