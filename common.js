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

export default IdGeneratorDictionary;