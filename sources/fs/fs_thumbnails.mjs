import path from 'path';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import constants from '../../constants.js';


export async function generate_thumbnail(source_base_dir, inputPath) {
    try {
        const relativePath = path.relative(source_base_dir, inputPath);
        const outputPath = path.join(constants.app_thumbnail_dir, relativePath);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        const thumbnail = await imageThumbnail(inputPath, { width: 200, responseType: 'buffer' });
        await fs.promises.writeFile(outputPath, thumbnail);
    } catch (error) {
        console.error(`Error processing ${inputPath}:`, error);
    }
}