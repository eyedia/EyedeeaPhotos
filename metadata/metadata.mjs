import sqlite3 from "sqlite3";
import fs from "fs";

const dbFile = './metadata/synoplayer.db';
let db = null;

export function meta_init(){
    const dbExists = fs.existsSync(dbFile);
    db = openDatabase();
    if (!dbExists) {
        createTables(db);
    }
}
function openDatabase() {
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

function createTables(db) {
    const createTableQueries = [
        `CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            param TEXT,
            param_name TEXT
            );`,
        // Add more CREATE TABLE statements as needed
    ];

    createTableQueries.forEach((query) => {
        db.run(query, (err) => {
            if (err) {
                console.error(err.message);
            } else {
                console.log('Table created successfully.');
            }
        });
    });
}

function executeQuery(db, query) {
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error executing query:', err.message);
        } else {
            console.table(rows);
        }
    });
}
