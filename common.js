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
    return `"${crypto.createHash('sha256').update(
        photo_data.id + 
        photo_data.folder_id + 
        photo_data.folder_name + 
        photo_data.filename
    ).digest('hex')}"`;
};

const cleanData = (obj) => {
  if (typeof obj === 'string') {    
    return obj.replace(/[^\x20-\x7E]/g, ''); // keep printable ASCII characters
  } else if (Array.isArray(obj)) {
    return obj.map(cleanData);
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = cleanData(obj[key]);
    }
    return newObj;
  } else {
    return obj;
  }
};

export default IdGeneratorDictionary;
export {generateETag, cleanData};