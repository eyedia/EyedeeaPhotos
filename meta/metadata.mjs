import sqlite3 from "sqlite3";
import fs from "fs";

const dbFile = './meta/synoplayer.db';
let meta_db = null;

export async function meta_init() {
    const dbExists = fs.existsSync(dbFile);
    meta_db = open_database();
    if (!dbExists) {
        create_tables();
    }
}
function open_database() {
    return new sqlite3.Database(dbFile,
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                process.exit(1);
            }
            console.log('Connected to database:', dbFile);
        });
}

function create_tables() {
    const createTableQueries = [
        `CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            param TEXT,
            param_name TEXT
            );`,

        `CREATE TABLE photo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id INT NOT NULL,
            filename TEXT NOT NULL, 
            folder_id INT NOT NULL,
            time INT,
            type TEXT,
            orientation INT, 
            cache_key TEXT,
            unit_id INT
            );`
        // Add more CREATE TABLE statements as needed
    ];

    createTableQueries.forEach((query) => {
        meta_db.run(query, (err) => {
            if (err) {
                console.error(err.message);
            } else {
                console.log('Table created successfully.');
            }
        });
    });
}

export function save_photo(json_data) {

    // json_data = {
    //     "photo_id": 32265,
    //     "filename": "DSC_0173.JPG",
    //     "folder_id": 820,
    //     "time": 1422185896,
    //     "type": "photo",
    //     "orientation": 1,
    //     "cache_key": "32265_1734881011",
    //     "unit_id": 32265
    // }
    const insert_query = `INSERT INTO photo (photo_id, filename, folder_id, time, type, orientation, cache_key, unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    meta_db.run(
        insert_query,
        [json_data.photo_id, json_data.filename, json_data.folder_id, json_data.time, json_data.type, json_data.orientation, json_data.cache_key, json_data.unit_id],
        function (err) {
            if (err) {
                console.error('Error inserting data:', err.message);
            }
        });

}

export function get_photos(callback) {
    let query = "SELECT * FROM photo WHERE type='photo' and id IN (SELECT id FROM photo WHERE type='photo' ORDER BY RANDOM() LIMIT 2)"
    meta_db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}
