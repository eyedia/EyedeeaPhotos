import config_log from "../config_log.js";
import { meta_db, get_rows } from "./meta_base.mjs";

const logger = config_log.logger;

export function create_or_update(source, callback) {
    let query = `select * from source where name = '${source.name}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 0) {
                meta_db.run(
                    `INSERT INTO source (name, type, url, user, password, config) VALUES (?, ?, ?, ?, ?, ?)`,
                    [source.name, source.type, source.url, source.user, source.password, JSON.stringify(source.config)],
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
                    [source.url, source.user, source.password, JSON.stringify(source.config), undefined, Date.now(), source.name],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                            callback(err, null, 500);
                        } else {
                            callback(null, rows[0], 200);
                        }
                    });
            }
        }
    });
}


export function update_cache(source, callback) {
    let query = `select * from source where name = '${source.name}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 1) {

                meta_db.run(
                    `UPDATE source set [cache] = ?, updated_at = ? where name = ?`,
                    [JSON.stringify(source.cache), Date.now(), source.name],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                            callback(err, null, 500);
                        } else {
                            rows[0]["cache"] = source.cache;
                            callback(null, rows[0], 200);
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
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

export function get(id, callback) {
    const try_id = parseInt(id);
    let query = `select * from source where id = ${id}`;
    if (isNaN(try_id))
        query = `select * from source where name = '${id}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
            callback(err, null);
        } else {
            let source = rows[0];
            if (source && (source.config != null || source.config != ""))
                source.config = JSON.parse(source.config);
            callback(null, source);
        }
    });
}

export function clear_cache(id, callback) {
    const try_id = parseInt(id);
    let query = `select * from source where id = ${id}`;
    if (isNaN(try_id))
        query = `select * from source where name = '${id}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
            callback(err, null);
        } else {
            if (rows.length == 1) {                
                meta_db.run(
                    `UPDATE source set [cache] = null, updated_at = ? where id = ?`,
                    [Date.now(), rows[0]["id"]],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                            callback(err, null, 500);
                        } else {                           
                            rows[0]["cache"] = undefined;
                            callback(null, rows[0], 200);
                        }
                    });
            } else {
                callback(null, null);
            }
        }
    });
}