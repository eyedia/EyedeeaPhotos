import fs from 'fs';


export async function get_photo(photo_data, res) {
    fs.readFile(photo_data.filename, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error reading image file.');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(data);
    });
}