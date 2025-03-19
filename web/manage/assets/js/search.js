const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const gallery = document.getElementById('gallery');
const searchBox = document.getElementById('searchBox');
const nameBox = document.getElementById('nameBox');
const searchButton = document.getElementById('searchButton');
const saveButton = document.getElementById('saveButton');
const footer = document.getElementById('footer');
const load_more = document.getElementById("load-more");

let offset = 0;
const limit = 40;
let keywords = '';
let totalPhotos = 0;

const fetchImages = async () => {
    try {
        let response = await fetch(`/api/system/search?keywords=${keywords}&limit=${limit}&offset=${offset}`);
        let data = await response.json();
        let thumbnails = [];
        data.forEach(item => {
            const photo_meta_data = JSON.parse(item["photo-meta-data"]);                        
            if (item["photo-data"] && item["photo-data"].data) {
                const bufferArray = new Uint8Array(item["photo-data"].data);
                const blob = new Blob([bufferArray], { type: "image/jpeg" });
                const imageUrl = URL.createObjectURL(blob);
                thumbnails.push(imageUrl);
            }
        });
        totalPhotos = 314;
        updateFooter();
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
        await fetch('https://example.com/api/save-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, search })
        });
        alert('Search saved successfully!');
    } catch (error) {
        console.error('Error saving search:', error);
        alert('Failed to save search.');
    }
};

const loadImages = async () => {
    const images = await fetchImages();
    images.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Thumbnail';
        img.className = 'thumbnail';
        gallery.appendChild(img);
    });
    offset += limit;
    updateFooter();
};

const updateFooter = () => {
    const displayedPhotos = Math.min(offset, totalPhotos);
    footer.textContent = `Showing ${displayedPhotos} out of ${totalPhotos} photos`;
    load_more.classList.add("show");
};

const loadMoreImagesOnScroll = () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight) {
        loadImages();
    }
};

searchBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        search();
    }
});

searchButton.addEventListener('click', () => {
    search();
});

function search(){
    keywords = searchBox.value.trim();
    gallery.innerHTML = '';
    offset = 0;
    load_more.classList.remove("show");
    loadImages();
}

nameBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        saveSearch();
    }
});

saveButton.addEventListener('click', saveSearch);

function openModal(){
    modal.style.display = 'flex';
    keywords = '';
    searchBox.value = '';
    searchBox.focus();
    nameBox.value = '';
    gallery.innerHTML = '';
    offset = 0;
    gallery.addEventListener('scroll', loadMoreImagesOnScroll);
}

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    gallery.innerHTML = '';
    offset = 0;
    gallery.removeEventListener('scroll', loadMoreImagesOnScroll);
    footer.textContent = '';
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal.click();
    }
});

load_more.addEventListener("click", () => {
    // let offset = Number(document.getElementById("load-more").getAttribute("data-offset")) || 0;
    // offset = offset + limit + 1;
    // document.getElementById("load-more").setAttribute("data-offset", offset);
    loadImages();
});
