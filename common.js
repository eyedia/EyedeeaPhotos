import crypto from 'crypto';

class IdGeneratorDictionary {
    constructor() {
        this.dirMap = new Map();
        this.nextDirId = 1;
    }

    getOrAddDirId(dir_name) {
        if (this.dirMap.has(dir_name)) {
            return this.dirMap.get(dir_name);
        } else {
            const dir_id = this.nextDirId++;
            this.dirMap.set(dir_name, dir_id);
            return dir_id;
        }
    }
}

const generateETag = (photo_data) => {
    //console.log(photo_data);
    return `"${crypto.createHash('md5').update(photo_data.id + photo_data.folder_id + photo_data.folder_name + photo_data.filename).digest('hex')}"`;

    // const hash = crypto
    //     .createHash('md5')
    //     .update(JSON.stringify(photo_data))
    //     .digest('hex');
    
    // return `"${hash}"`;
};

export default IdGeneratorDictionary;
export {generateETag};