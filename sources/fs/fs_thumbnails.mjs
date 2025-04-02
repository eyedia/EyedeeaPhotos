import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import constants from '../../constants.js';

const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200

export async function generate_thumbnail(source_base_dir, inputPath) {
    try {
        const relativePath = path.relative(source_base_dir, inputPath);
        const outputPath = path.join(constants.app_thumbnail_dir, relativePath);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        const image = sharp(inputPath).rotate();
        const metadata = await image.metadata();
        const thumbnailBuffer = await image
            .resize({
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT,
                fit: 'contain',
                background: { r: 0, g: 0, b: 0 }
            })
            .toBuffer();

        await fs.promises.writeFile(outputPath, thumbnailBuffer);

    } catch (error) {
        console.error(`Error processing ${inputPath}:`, error);
    }
}