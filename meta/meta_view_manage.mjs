import config_log from "../config_log.js";
import { meta_db, get_rows } from "./meta_base.mjs";
import {set_random_photo} from "./meta_view.mjs";

const logger = config_log.logger;

export function create_or_update(view_filter, callback) {
    let query = `select * from view_filter where name = '${view_filter.name}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 0) {
                meta_db.run(
                    `INSERT INTO view_filter (name, filter_must, filter_option, current) VALUES (?, ?, ?, ?)`,
                    [view_filter.name, view_filter.filter_must, view_filter.filter_option, view_filter.current],
                    function (err) {
                        if (err) {
                            logger.error('Error inserting data:', err);
                            callback(err, null, 500);
                        } else {
                            callback(null, this.lastID, 201);
                        }
                    });
            } else {
                meta_db.run(
                    `UPDATE view_filter set filter_must = ?, filter_option = ?, current = ?, updated_at = ? where name = ?`,
                    [view_filter.filter_must, view_filter.filter_option, view_filter.current, Date.now(), source.name],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                            callback(err, null, 500);
                        } else {
                            callback(null, rows[0]["id"], 200);
                        }
                    });
            }
        }
    });
}


export function set_current(name, callback) {
    let query = `select * from view_filter where name = '${name}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (rows.length == 1) {

                meta_db.run(
                    `UPDATE view_filter set current = 1, updated_at = ? where name = ?`,
                    [Date.now(), name],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                            callback(err, null, 500);
                        } else {
                            meta_db.run(
                                `UPDATE view_filter set current = 0 where name != ?`,
                                [name],
                                function (err) {
                                    if (err) {
                                        logger.error('Error updating data:', err);
                                        callback(err, null, 500);
                                    } else {
                                        callback(null, rows[0], 200);
                                    }
                                });
                        }
                    });
            } else {
                callback(null, null);
            }
        }
    });
}


export function list(callback) {
    let query = `select * from view_filter`;
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
    let query = `select * from view_filter where id = ${id}`;
    if (isNaN(try_id))
        query = `select * from view_filter where name = '${id}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
            callback(err, null);
        } else {
            callback(null, rows[0]);
        }
    });
}


export function make_active(id, callback) {
    const try_id = parseInt(id);
    let query = `select * from view_filter where id = ${id}`;
    if (isNaN(try_id))
        query = `select * from view_filter where name = '${id}' COLLATE NOCASE`;
    get_rows(query, (err, rows) => {
        if (err) {
            logger.error(err.message);
            callback(err, null);
        } else {
            if (rows.length == 1) {
                meta_db.run(
                    `UPDATE view_filter set current = 1 where id == ?`,
                    [rows[0]["id"]],
                    function (err) {
                        if (err) {
                            logger.error('Error updating data:', err);
                            callback(err, null);
                        } else {
                            meta_db.run(
                                `UPDATE view_filter set current = 0 where id != ?`,
                                [rows[0]["id"]],
                                function (err) {
                                    if (err) {
                                        logger.error('Error updating data:', err);
                                        callback(err, null);
                                    } else {
                                        meta_db.run(
                                            //disable pending random photos (status is non zero)
                                            //so that new photos from new filter are picked up
                                            `UPDATE view_log set status = 2 where status = 0`,
                                            [rows[0]["id"]],
                                            function (err) {
                                                if (err) {
                                                    logger.error('Error updating data:', err);
                                                    callback(err, null);
                                                } else {
                                                    set_random_photo();
                                                    rows[0].current = 1;
                                                    callback(null, rows[0]);
                                                }
                                            });
                                    }
                                });
                        }
                    });
            } else {
                callback({ "message": "No record found!" }, null);
            }
        }
    });
}