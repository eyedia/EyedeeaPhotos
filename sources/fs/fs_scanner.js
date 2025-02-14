
import fs from 'fs';
import path from 'path';

const source_name = "fs"

export async function scan(dir) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return;
    }

    files.forEach(file => {
      const file_path = path.join(dir, file);
      fs.stat(file_path, (err, stats) => {
        if (err) {
          console.error('Error getting file stats:', err);
          return;
        }
        if (stats.isFile() && path.extname(file).toLowerCase() === '.jpg') {
          console.log('JPG File:', file_path);
          // Perform actions with the JPG file here, like copying or processing
        } else if (stats.isDirectory()) {
            scan(file_path); // Recursive call for subdirectories
        }
      });
    });
  });
}
