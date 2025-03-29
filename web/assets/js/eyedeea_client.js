const photo_url_server = window.location.protocol + "//" + window.location.host + "/api/view";
//const photo_url_server = "http://192.168.86.101/api/view"

async function cache_incoming_photos() {
    console.time("cache_photos");
    var total = 13;
    
    const response = await fetch(photo_url_server + `/photos?photo_id_only=true&limit=${total}`);
    if (!response.ok)
        return;
    
    const photo_ids = await response.json();    
    photo_ids.forEach(async function(photo_id) {
        const response = await fetch(photo_url_server + `/photos/${photo_id}`);
        if (!response.ok)
            return;
        await save_photo_from_respose(response);
            
      });

      console.timeEnd("cache_photos");
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

    save_photo_to_cache(blob, photo_orientation, photo_data);
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
    photo_info = save_photo_from_respose(response);
    // const blob = await response.blob();
    // const this_photo_url = URL.createObjectURL(blob);
    // const this_photo_size = await get_photo_size(this_photo_url);
    // let photo_orientation = (this_photo_size.height > this_photo_size.width) ? "P" : "L";
    // const v_photo_data = response.headers.get("photo-data");
    // let photo_data = undefined;
    // if (v_photo_data)
    //     photo_data = JSON.parse(v_photo_data);

    // save_photo_to_cache(blob, photo_orientation, photo_data);
    // console.log("server", photo_data);
    //console.timeEnd("ts_get_photo_" + photo_index);
    
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


function open_cache_db() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EyedeeaPhotos', 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id' });
            }
        };

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

async function save_photo_to_cache(blob, orientation, photo_data) {
    if (!photo_data)
        return;
    const key = photo_data.photo_id;

    const count = await get_cache_item_count();

    if (count >= 24) {
        await delete_oldest_entries_from_cache(12);
    }

    const db = await open_cache_db();
    const transaction = db.transaction('photos', 'readwrite');
    const store = transaction.objectStore('photos');

    store.put({ id: key, blob: blob, orientation: orientation, photo_data: photo_data });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (event) => reject(event.target.error);
    });
}


async function retrieve_photo_from_cache(key) {
    const db = await open_cache_db();
    const transaction = db.transaction('photos', 'readonly');
    const store = transaction.objectStore('photos');
    const request = store.get(key);

    return new Promise((resolve, reject) => {
        request.onsuccess = function (event) {
            const result = event.target.result;
            if (result) {
                const blob = result.blob;
                const photo_url = URL.createObjectURL(blob);
                const photo_info = {
                    "url": photo_url,
                    "orientation": result.orientation,
                    "meta_data": result.photo_data,
                }
                resolve(photo_info);
            } else {
                resolve(null);
            }
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

async function get_cache_item_count() {
    const db = await open_cache_db();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('photos', 'readonly');
        const store = transaction.objectStore('photos');
        const request = store.count();

        request.onsuccess = function () {
            resolve(request.result);
        };
        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

async function delete_oldest_entries_from_cache(count_to_delete = 10) {
    const db = await open_cache_db();
    const transaction = db.transaction('photos', 'readwrite');
    const store = transaction.objectStore('photos');
    const request = store.openCursor();

    let deletedCount = 0;
    return new Promise((resolve, reject) => {
        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor && deletedCount < count_to_delete) {
                store.delete(cursor.primaryKey);
                deletedCount++;
                cursor.continue();
            } else {
                resolve(deletedCount);
            }
        };
        request.onerror = (event) => reject(event.target.error);
    });
}
