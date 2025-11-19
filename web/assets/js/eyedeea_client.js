const photo_url_server = window.location.protocol + "//" + window.location.host + "/api/view";
//const photo_url_server = "http://192.168.86.101/api/view"

// In-memory cache
const memoryCache = new Map();
const MAX_MEMORY_CACHE = 24;

async function cache_incoming_photos() {
    console.time("cache_photos");
    const total = 13;
    const CONCURRENT_REQUESTS = 3;
    
    try {
        const response = await fetch(photo_url_server + `/photos?photo_id_only=true&limit=${total}`);
        if (!response.ok) return;
        
        const photo_ids = await response.json();
        
        for (let i = 0; i < photo_ids.length; i += CONCURRENT_REQUESTS) {
            const batch = photo_ids.slice(i, i + CONCURRENT_REQUESTS);
            await Promise.all(batch.map(photo_id => 
                fetch(photo_url_server + `/photos/${photo_id}`)
                    .then(response => {
                        if (!response.ok) return;
                        return save_photo_from_respose(response);
                    })
                    .catch(error => console.error(`Error caching photo ${photo_id}:`, error))
            ));
        }
        
        console.timeEnd("cache_photos");
    } catch (error) {
        console.error('Error in cache_incoming_photos:', error);
        console.timeEnd("cache_photos");
    }
}

async function save_photo_from_respose(response){
    const blob = await response.blob();
    const this_photo_url = URL.createObjectURL(blob);
    const this_photo_size = await get_photo_size(this_photo_url);
    let photo_orientation = (this_photo_size.height > this_photo_size.width) ? "P" : "L";
    const v_photo_data = response.headers.get("photo-data");
    let photo_data = undefined;
    if (v_photo_data)
        photo_data = JSON.parse(v_photo_data);

    await save_photo_to_cache(photo_data, this_photo_url, photo_orientation);
    
    let photo_info = {
        "url": this_photo_url,
        "orientation": photo_orientation,
        "meta_data": photo_data,
    }
    return photo_info;
}

async function get_photo(photo_index) {
    //console.time("ts_get_photo_" + photo_index);
    let photo_url = photo_url_server;
    let photo_url_id_only = undefined;
    if (photo_index) {
        photo_url = photo_url + `?photo_index=${photo_index}`;
        photo_url_id_only = photo_url + `&photo_id_only=true`;    
    
        const response_id = await fetch(photo_url_id_only);
        if (response_id.ok) {
            const json_data = await response_id.json();
            const cache_data = await retrieve_photo_from_cache(json_data.photo_id);
            if (cache_data != null) {
                //console.timeEnd("ts_get_photo_" + photo_index);                
                cache_data.meta_data.photo_index = photo_index;
                return cache_data;
            }
        }
    }
    
    const response = await fetch(photo_url);
    if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        const photo_data = {
            "folder_name": "Eyedeea Photos",
            "photo_index": photo_index
        };
        let photo_info = {
            "url": "/eyedeea_photos.jpg",
            "orientation": "L",
            "meta_data": photo_data,
        }
        return photo_info;
    }
    photo_info = await save_photo_from_respose(response);    
    return photo_info;
}

async function get_photo_size(photo_url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const { width, height } = img;
            resolve({ width, height });
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };
        img.src = photo_url;
    });
}

async function get_config() {
    return fetch(photo_url_server + "/config")
        .then(response => response.json())
        .then(data => {
            return data;
        });
}

function set_tag(photo_id, tag) {
    fetch(photo_url_server + "/" + photo_id + "/" + tag, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(responseData => {
            //console.log('Success:', responseData);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

async function save_photo_to_cache(photo_data, photo_url, orientation) {
    if (!photo_data) return;
    
    const key = photo_data.photo_id;
    
    // Check if already cached
    if (memoryCache.has(key)) {
        console.log(`Photo ${key} already cached, skipping`);
        return;
    }
    
    // If cache is full, delete oldest entry
    if (memoryCache.size >= MAX_MEMORY_CACHE) {
        const firstKey = memoryCache.keys().next().value;
        const oldPhoto = memoryCache.get(firstKey);
        URL.revokeObjectURL(oldPhoto.url);
        memoryCache.delete(firstKey);
        console.log(`Evicted ${firstKey} from cache`);
    }
    
    const photo_info = {
        "url": photo_url,
        "orientation": orientation,
        "meta_data": photo_data,
    };
    
    memoryCache.set(key, photo_info);
    console.log(`Cached photo ${key}, cache size: ${memoryCache.size}`);
}

async function retrieve_photo_from_cache(key) {
    if (memoryCache.has(key)) {
        console.log(`Retrieved ${key} from memory cache`);
        return memoryCache.get(key);
    }
    return null;
}

async function get_cache_item_count() {
    return memoryCache.size;
}

async function delete_oldest_entries_from_cache(count_to_delete = 5) {
    let deletedCount = 0;
    for (const [key, photo] of memoryCache.entries()) {
        if (deletedCount >= count_to_delete) break;
        URL.revokeObjectURL(photo.url);
        memoryCache.delete(key);
        deletedCount++;
    }
    console.log(`Deleted ${deletedCount} entries from cache`);
    return deletedCount;
}

// Clean up blob URLs on page unload
window.addEventListener('beforeunload', () => {
    memoryCache.forEach((photo_info) => {
        if (photo_info.url) {
            URL.revokeObjectURL(photo_info.url);
        }
    });
    memoryCache.clear();
});