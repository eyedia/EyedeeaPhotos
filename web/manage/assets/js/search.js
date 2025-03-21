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

let offset = 0;
const limit = 40;
let keywords = '';
let totalPhotos = 0;

const fetchImages = async () => {    
    try {
        // if(keywords == ""){
        //     return [];
        // }
        let response = await fetch(`/api/system/search?keywords=${keywords}&limit=${limit}&offset=${offset}`);
        let data = await response.json();
        let thumbnails = [];
        if (data.thumbnails){
            data.thumbnails.forEach(item => {                                
                if (item["photo-data"] && item["photo-data"].data) {
                    const bufferArray = new Uint8Array(item["photo-data"].data);
                    const blob = new Blob([bufferArray], { type: "image/jpeg" });
                    const imageUrl = URL.createObjectURL(blob);
                    thumbnails.push({"imageUrl": imageUrl, "folderName": item["photo-meta-data"].folder_name + "/" + item["photo-meta-data"].filename});
                }
            });
            totalPhotos = data.total_records;
            updateFooter();
        }
        return thumbnails; // assuming API returns { images: [url1, url2, ...] }
    } catch (error) {
        console.error('Error fetching images:', error);
        return [];
    }
};

const saveSearch = async () => {
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
        closeModal.click();
        
    } catch (error) {
        console.error('Error saving search:', error);
    }
};

const loadImages = async () => {
    const loader = document.getElementById("loader-container");
    loader.style.display = "flex";

    const thumbnails = await fetchImages();
    thumbnails.forEach(thumbnail => {
        const img = document.createElement('img');
        img.src = thumbnail.imageUrl;
        img.alt = 'Thumbnail';
        img.className = 'thumbnail';
        img.title = thumbnail.folderName;
        gallery.appendChild(img);
    });
    offset += limit;
    updateFooter();
    loader.style.display = "none";
};

const updateFooter = () => {
    if (totalPhotos > 0){
        const displayedPhotos = Math.min(offset, totalPhotos);
        footer.textContent = `Showing ${displayedPhotos} out of ${totalPhotos} photos`;
        if(displayedPhotos != totalPhotos){
            load_more.classList.add("show");         
        }else{
            load_more.classList.remove("show");
        }
    }else{
        footer.textContent = "No photos found!";
        load_more.classList.remove("show");
    }
};

const loadMoreImagesOnScroll = () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight) {
        loadImages();
    }
};

if (searchBox){
    searchBox.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            search();
        }
    });
}

if (g_searchBox){
    g_searchBox.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            search();
        }
    });
}


if(searchButton){
    searchButton.addEventListener('click', () => {
        search();
    });
}

function search(){
    keywords = searchBox? searchBox.value.trim() : g_searchBox.value.trim();
    gallery.innerHTML = '';
    offset = 0;
    load_more.classList.remove("show");
    loadImages();
}

if(nameBox){
    nameBox.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            saveSearch();
        }
    });
}

// if(saveButton){
//     console.log(saveButton);
//     saveButton.addEentListener('click', saveSearch);
// }

function openModal(){
    modal.style.display = 'flex';
    keywords = '';
    searchBox.value = '';
    searchBox.focus();
    nameBox.value = '';
    gallery.innerHTML = '';
    offset = 0;
    sidebar.classList.add("inactive");
    gallery.addEventListener('scroll', loadMoreImagesOnScroll);
}

if(closeModal){
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        gallery.innerHTML = '';
        offset = 0;
        gallery.removeEventListener('scroll', loadMoreImagesOnScroll);
        footer.textContent = '';
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if(closeModal)
            closeModal.click();
    }
});

load_more.addEventListener("click", () => {
    loadImages();
    setTimeout(() => {
        gallery.scrollIntoView(false);
    }, 500);
    
});

function show_notification(message){
    console.log(message);
    const notification = document.getElementById("notification");
    notification.innerText = message;
    notification.style.display = "block";
            setTimeout(() => {
                notification.style.opacity = "0";
                setTimeout(() => {
                    notification.style.display = "none";
                    notification.style.opacity = "1";
                }, 1000);
            }, 2000);
}