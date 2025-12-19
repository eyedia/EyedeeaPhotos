const photo_url_server = window.location.protocol + "//" + window.location.host + "/api/view";
//const photo_url_server = "http://192.168.86.101/api/view"

// In-memory cache
const memoryCache = new Map();
const MAX_MEMORY_CACHE = 24;

// Error log box helper functions
function showErrorLog(message) {
    const logBox = document.getElementById("error-log-box");
    const messageEl = document.getElementById("error-message");
    if (logBox && messageEl) {
        // Convert pipe separators back to line breaks for display
        const displayMessage = message.replace(/ \| /g, '\n');
        messageEl.textContent = displayMessage;
        logBox.style.display = "block";
    }
}

function hideErrorLog() {
    const logBox = document.getElementById("error-log-box");
    if (logBox) {
        logBox.style.display = "none";
    }
}

async function cache_incoming_photos() {
    console.time("cache_photos");
    const CONCURRENT_REQUESTS = 5;
    
    try {
        const response = await fetch(photo_url_server + `/photos?photo_id_only=true&limit=13`);
        if (!response.ok) return;
        
        const data = await response.json();
        // Server now returns { total, photo_ids }
        const photo_ids = data.photo_ids || data || [];
        const total = data.total || photo_ids.length;
        
        // Update global total for slideshow to use actual available photos
        window.availablePhotoCount = total;
        
        for (let i = 0; i < photo_ids.length; i += CONCURRENT_REQUESTS) {
            const batch = photo_ids.slice(i, i + CONCURRENT_REQUESTS);
            await Promise.all(batch.map(photo_id => 
                fetch(photo_url_server + `/photos/${photo_id}`, { signal: AbortSignal.timeout(10000) })
                    .then(response => {
                        if (!response.ok) return;
                        return save_photo_to_cache_fast(response);
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

// Fast cache without dimension calculation
async function save_photo_to_cache_fast(response) {
    try {
        const blob = await response.blob();
        const this_photo_url = URL.createObjectURL(blob);
        const v_photo_data = response.headers.get("photo-data");
        let photo_data = undefined;
        
        if (v_photo_data) {
            photo_data = JSON.parse(v_photo_data);
        }

        // Skip orientation calculation during bulk cache
        let photo_orientation = "L"; // Default orientation
        
        await save_photo_to_cache(photo_data, this_photo_url, photo_orientation);
    } catch (error) {
        console.error('Error in save_photo_to_cache_fast:', error);
    }
}

// Keep original for on-demand photo loading (needs accurate orientation)
async function save_photo_from_respose(response){
    const blob = await response.blob();
    const this_photo_url = URL.createObjectURL(blob);
    const this_photo_size = await get_photo_size(this_photo_url); // Only when actually displaying
    let photo_orientation = (this_photo_size.height > this_photo_size.width) ? "P" : "L";
    const v_photo_data = response.headers.get("photo-data");
    let photo_data = undefined;
    if (v_photo_data)
        photo_data = JSON.parse(v_photo_data);

    // Check for error headers and display error log if needed
    const imageStatus = response.headers.get("X-Image-Status");
    const errorMessage = response.headers.get("X-Error-Message");
    if (imageStatus === "error" && errorMessage) {
        showErrorLog(errorMessage);
    } else if (imageStatus === "ok") {
        hideErrorLog();
    }

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
    
    // Default fallback photo for any errors
    const defaultPhoto = {
        "url": "/eyedeea_photos.jpg",
        "orientation": "L",
        "meta_data": {
            "folder_name": "Eyedeea Photos",
            "photo_index": photo_index
        },
    };
    
    try {
        if (photo_index !== undefined && photo_index !== null) {
            // First, get the exact photo_id for this index from the lineup
            photo_url = photo_url + `?photo_index=${photo_index}`;
            photo_url_id_only = photo_url + `&photo_id_only=true`;    
            
            const response_id = await fetch(photo_url_id_only, { cache: 'no-store' });
            if (response_id.ok) {
                const json_data = await response_id.json();
                // Fetch the exact photo by ID to avoid server recomputation returning the same current
                const resp = await fetch(photo_url_server + `/photos/${json_data.photo_id}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
                if (resp.ok) {
                    const photo_info = await save_photo_from_respose(resp);
                    // Safely set photo_index only if photo_info and meta_data exist
                    if (photo_info && photo_info.meta_data) {
                        photo_info.meta_data.photo_index = photo_index;
                        return photo_info;
                    } else {
                        console.warn(`Photo info or metadata undefined for index ${photo_index}, using default`);
                        return defaultPhoto;
                    }
                }
            }
        }
        
        const response = await fetch(photo_url, { cache: 'no-store' });
        let photo_info;

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return defaultPhoto;
        }

        photo_info = await save_photo_from_respose(response);
        // Safely set photo_index if photo_info exists
        if (photo_info && photo_info.meta_data) {
            photo_info.meta_data.photo_index = photo_index;
            return photo_info;
        } else {
            console.warn(`Photo info or metadata undefined, using default`);
            return defaultPhoto;
        }
    } catch (error) {
        console.error(`Error in get_photo(${photo_index}):`, error);
        return defaultPhoto;
    }
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
    const url = photo_url_server + "/" + photo_id + "/" + tag;
    console.log("Setting tag via URL:", url);
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
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
    if (memoryCache.has(key)) {       
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