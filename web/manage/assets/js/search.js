const sidebar = document.getElementById('sidebar');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const gallery = document.getElementById('gallery');
const searchBox = document.getElementById('searchBox');
const g_searchBox = document.getElementById('g-search-searchBox');
const nameBox = document.getElementById('nameBox');
const searchButton = document.getElementById('searchButton');
//const saveButton = document.getElementById('saveButton');
const footer = document.getElementById('footer');
const load_more = document.getElementById("load-more");

const divCreateFilter = document.getElementById("divCreateFilter");

const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById('viewer-img');
const loadingText = document.getElementById('loading');

let offset_search = 0;
const limit = 40;
let keywords = '';
let totalPhotos = 0;

function openPlayerFilterPopup(){
    clearSearch();
    sidebar.classList.add('inactive');
    window.dialog.showModal();
}

function enableSearchButton() {
    if (searchBox.value.length >= 3)
        searchButton.classList.remove("disabled");
    else
        searchButton.classList.add("disabled");
}

const fetchImages = async (dir) => {    
    
    try {
        if ((keywords == "") && !(dir)) {
            footer.textContent = '';
            return [];
        }
        let response = null;
        if(dir)
            response = await fetch(`/api/sources/${dir.source_id}/dirs/${dir.dir_id}?limit=${limit}&offset=${offset_search}`);
        else
            response = await fetch(`/api/system/search?keywords=${keywords}&limit=${limit}&offset=${offset_search}`);
        
        let data = await response.json();
        
        //checking for known errors
        if ((data) && (data.message) && (data.message.code) && (data.message.details)){
            show_notification(`${data.message.code}: ${data.message.details}`, true);
            return [];
        }
        let thumbnails = [];
        if (data.thumbnails){
            data.thumbnails.forEach(item => {                                
                if (item["photo-data"] && item["photo-data"].data) {                    
                    const bufferArray = new Uint8Array(item["photo-data"].data);
                    const blob = new Blob([bufferArray], { type: "image/jpeg" });
                    const imageUrl = URL.createObjectURL(blob);
                    const thumbnail = {
                        "photo_id": item["photo-meta-data"].photo_id,
                        "cache_key": item["photo-meta-data"].cache_key,
                        "imageUrl": imageUrl,
                        "folderName": item["photo-meta-data"].folder_name + "/" + item["photo-meta-data"].filename
                    }
                    thumbnails.push(thumbnail);
                }
            });
            totalPhotos = data.total_records;            
        }else{
            totalPhotos = 0;
        }
        updateFooter();
        return thumbnails;
    } catch (error) {       
        console.error('Error fetching images:', error);
        return [];
    }
};

const saveFilter = async () => {
    const name = nameBox.value.trim();
    const search = searchBox.value.trim();

    if (!name || !search) {
        alert('Please provide both a name and a search term.');
        return;
    }

    try {
        await fetch(`/api/view/filters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "name": name, "filter_must": search })
        });
        get_filters(undefined, 0);
        show_notification("Filter added! You can now activate your newly created filter.");
        closeModal.click();
        
    } catch (error) {
        console.error('Error saving search:', error);
    }
};

const loadImages = async (dir) => {
    updateFooter(true);
    const loader = document.getElementById("loader");
    loader.style.display = "flex";    
    const thumbnails = await fetchImages(dir);
    thumbnails.forEach(thumbnail => {
        const img = document.createElement('img');
        img.src = thumbnail.imageUrl;
        img.alt = 'Thumbnail';
        img.className = 'thumbnail';
        img.title = thumbnail.folderName;
        img.setAttribute('photo-data', JSON.stringify(thumbnail));
        img.onclick = this.viewImage;
        gallery.appendChild(img);
    });
    offset_search += limit;
    updateFooter();
    loader.style.display = "none";
};

const updateFooter = (loading) => {
    if(loading){
        footer.textContent = "Searching...";
        return;
    }
    if (totalPhotos > 0){
        const displayedPhotos = Math.min(offset_search, totalPhotos);
        footer.textContent = `Showing ${displayedPhotos} out of ${totalPhotos} photos`;
        if(displayedPhotos != totalPhotos){
            load_more.classList.add("show");         
        }else{
            load_more.classList.remove("show");
        }
        if(divCreateFilter)
            divCreateFilter.classList.remove("hidden");
    }else{
        footer.textContent = "No photos found!";
        load_more.classList.remove("show");
        if(divCreateFilter)
            divCreateFilter.classList.add("hidden");
    }
};

const loadMoreImagesOnScroll = () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight) {
        loadImages();
    }
};

if (searchBox){
    searchBox.addEventListener("keydown", function (event) {
        if ((event.key === "Enter") && (searchBox.value.length >= 3)) {
            search();
        }
    });
}

if (g_searchBox){
    g_searchBox.addEventListener("keydown", function (event) {
        if ((event.key === "Enter") && (g_searchBox.value.length >= 3)) {
            search();
        }
    });
}


if(searchButton){
    searchButton.addEventListener('click', () => {
        search();
    });
}

function search(dir){
     /* Can be triggered from:

    player.html > searchBox
    photos.html > g_searchBox
    global search top left > photos.html > g_searchBox
    source.html > show dir photos > g-search-dir
    */
    
    //from global search or photos.html search    
    keywords = searchBox? searchBox.value.trim() : g_searchBox.value.trim();
    gallery.innerHTML = '';
    offset_search = 0;
    load_more.classList.remove("show");
    if(keywords != "")
        loadImages();
    else
        loadImages(dir);
}

if(nameBox){
    nameBox.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            saveFilter();
        }
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if(closeModal)
            closeModal.click();

        if(viewer){
            viewer.style.display = 'none';
        }
    }else if (event.key === 'ArrowRight') {
        changeImage(true);
    } else if (event.key === 'ArrowLeft') {
        changeImage();
    }
});

load_more.addEventListener("click", () => {
    loadImages();
    setTimeout(() => {
        gallery.scrollIntoView(false);
    }, 500);
    
});


function changeImage(next){
    if(currently_viewing){
        try_next_node = next?currently_viewing.nextSibling: currently_viewing.previousSibling;
        if(try_next_node){
            currently_viewing = try_next_node;
            const photo_data = JSON.parse(currently_viewing.getAttribute('photo-data'));
            updateImage(photo_data.photo_id);
        }
    }
}

function updateImage(photo_id) {
    viewerImg.style.display = 'none';
    loadingText.style.display = 'block';
    viewerImg.src = `/api/view/photos/${photo_id}`;
    viewerImg.onload = function() {
        loadingText.style.display = 'none';
        viewerImg.style.display = 'block';
        if (viewerImg.naturalWidth > viewerImg.naturalHeight) {
            viewerImg.style.width = '80%';
            viewerImg.style.height = 'auto';
        } else {
            viewerImg.style.width = 'auto';
            viewerImg.style.height = '80%';
        }
    };
}

function closeViewer() {
    viewer.style.display = 'none';
}

function clearSearch(){
    if(divCreateFilter){
        divCreateFilter.classList.add("hidden");
        load_more.classList.remove("show");
        searchBox.value = "";
        searchButton.classList.add("disabled");
    }else{
        g_searchBox.value = "";
        //g_searchButton.classList.add("hidden");
    }

    footer.textContent = '';
    if(gallery)
        gallery.innerHTML = '';

    if(footer)
        footer.textContent = '';
}