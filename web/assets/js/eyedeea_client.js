const photo_url_server = window.location.protocol + "//" + window.location.host + "/api/view";
//const photo_url_server = "http://192.168.86.101/api/view"

async function get_photo(photo_index) {
    //console.time("ts_get_photo_" + photo_index);
    let photo_url = photo_url_server;
    let photo_url_id_only = undefined;
    if (photo_index) {
        photo_url = photo_url + `?photo_index=${photo_index}`;
        photo_url_id_only = photo_url + `&photo_id_only=true`;
    }
    if (photo_url_id_only) {
        const response = await fetch(photo_url_id_only);
        if (response.ok) {
            const json_data = await response.json();
            const cache_data = await retrieve_photo_from_cache(json_data.photo_id);
            if (cache_data != null) {
                //console.timeEnd("ts_get_photo_" + photo_index);
                return cache_data;
            }
        }
    }
    const response = await fetch(photo_url);
    if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        const fake_headers = new Map();
        fake_headers.set('Content-Type', 'image/jpeg');
        const photo_data = {
            "folder_name": "Eyedeea Photos",
            "photo_index": photo_index,
            "time": Math.floor(Date.now() / 1000)
        };
        fake_headers.set('Photo-Data', JSON.stringify(photo_data));
        return ["/eyedeea_photos.jpg", "L", fake_headers];
    }
    const blob = await response.blob();
    const this_photo_url = URL.createObjectURL(blob);
    const this_photo_size = await get_photo_size(this_photo_url);
    let photo_orientation = (this_photo_size.height > this_photo_size.width) ? "P" : "L";
    const v_photo_data = response.headers.get("photo-data");
    let photo_data = undefined;
    if (v_photo_data)
        photo_data = JSON.parse(v_photo_data);

    save_photo_to_cache(blob, photo_orientation, photo_data);
    //console.timeEnd("ts_get_photo_" + photo_index);
    return [this_photo_url, photo_orientation, photo_data];
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


function openDB() {
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

    const db = await openDB();
    const transaction = db.transaction('photos', 'readwrite');
    const store = transaction.objectStore('photos');

    store.put({ id: key, blob: blob, orientation: orientation, photo_data: photo_data });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (event) => reject(event.target.error);
    });
}


async function retrieve_photo_from_cache(key) {
    const db = await openDB();
    const transaction = db.transaction('photos', 'readonly');
    const store = transaction.objectStore('photos');
    const request = store.get(key);

    return new Promise((resolve, reject) => {
        request.onsuccess = function (event) {
            const result = event.target.result;
            if (result) {
                const blob = result.blob;
                const photo_url = URL.createObjectURL(blob);
                resolve([photo_url, result.orientation, result.photo_data]);
            } else {
                resolve(null);
            }
        };
        request.onerror = (event) => reject(event.target.error);
    });
}


/*
function retrieve_photo_from_cache_using_local_storage(key) {
    const cache_data = localStorage.getItem(key);
    if (!cache_data) return null;

    const data = JSON.parse(cache_data);        

    // Convert base64 to Blob
    const byteCharacters = atob(data.photo_url.split(',')[1]); 
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpg" });

    const photo_url = URL.createObjectURL(blob);
    return [photo_url, data.orientation, data.photo_data];
}


function save_photo_to_cache_using_local_storage(blob, orientation, photo_data) {
    if (!photo_data)
        return;
    const key = photo_data.photo_id;   
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
        const data = {            
            "orientation": orientation,
            "photo_data": photo_data,
            "photo_url": reader.result
    
        }
        localStorage.setItem(key, JSON.stringify(data));
        //localStorage.setItem(key, reader.result);
    };
}*/
