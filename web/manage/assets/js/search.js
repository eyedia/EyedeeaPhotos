const modal = document.getElementById('modal');
const openModal = document.getElementById('openModal');
const closeModal = document.getElementById('closeModal');
const gallery = document.getElementById('gallery');
const searchBox = document.getElementById('searchBox');
const nameBox = document.getElementById('nameBox');
const searchButton = document.getElementById('searchButton');
const saveButton = document.getElementById('saveButton');
const footer = document.getElementById('footer');

let offset = 0;
const limit = 20;
let keywords = '';
let totalPhotos = 0;

const fetchImages = async () => {
    try {
        let offset = 0;
        let limit = 40;
        //let keywords = 'belize';
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
    gallery.innerHTML = ''; // Clear existing thumbnails
    offset = 0; // Reset offset
    loadImages(); // Load images based on new search term
}

saveButton.addEventListener('click', saveSearch);

openModal.addEventListener('click', () => {
    modal.style.display = 'flex';
    keywords = ''; // Reset search term
    searchBox.value = ''; // Clear search box
    nameBox.value = ''; // Clear name box
    gallery.innerHTML = ''; // Clear gallery
    offset = 0; // Reset offset
    //loadImages();
    gallery.addEventListener('scroll', loadMoreImagesOnScroll);
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    gallery.innerHTML = '';
    offset = 0;
    gallery.removeEventListener('scroll', loadMoreImagesOnScroll);
    footer.textContent = ''; // Clear footer
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal.click();
    }
});

window.onclick = (event) => {
    if (event.target === modal) {
        closeModal.click();
    }
};
