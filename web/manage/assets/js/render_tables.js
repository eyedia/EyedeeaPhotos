let limit = 30;
let offset = 0;
let currentPage = 1;
let totalPages = 1;
let pageGroupSize = 5;
let paginationUl = "pagination_dir";
//const apiUrl = `/api/sources/${g_source.id}/dirs`;

async function get_source_dirs(offset) {
    if (g_source == null) {
        console.log("retr")
        return;
    }
    try {
        const apiUrl = `/api/sources/${g_source.id}/dirs`;
        if (!offset)
            offset = 0;
        fetch(`${apiUrl}?limit=${limit}&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                totalPages = data.total_pages;
                renderTable(data.records);
                renderPagination(currentPage, totalPages);
            })
            .catch(error => console.error("Error fetching data:", error));


    } catch (error) {
        console.error('Error fetching data:', error);
    }
}


function renderTable(records) {
    const tableBody = document.getElementById("dirs-table-body");
    tableBody.innerHTML = '';

    records.forEach(item => {
        const row = `<tr>            
            <td>${item.dir}</td>
            <td><a href='photos.html?source-id=${g_source.id}&source-name=${g_source.name}&dir-id=${item.dir_id}&dir-name=${item.dir}'>${item.photos}</a></td>
        </tr>`;

        tableBody.innerHTML += row;
    });
}

function renderPagination(currentPage, totalPages) {    
    let page_ul = document.getElementById(paginationUl);
    page_ul.innerHTML = "";

    let startPage = Math.floor((currentPage - 1) / pageGroupSize) * pageGroupSize + 1;
    let endPage = Math.min(startPage + pageGroupSize - 1, totalPages);

    let prevButton = document.createElement("span");
    prevButton.textContent = "Prev";
    prevButton.className = "button";
    if (currentPage <= 1)
        prevButton.classList.add("disabled");

    prevButton.onclick = () => {
        currentPage = Math.max(1, currentPage - pageGroupSize);
        offset = (currentPage - 1) * limit;
        get_source_dirs(offset);
    };
    let prev_li = document.createElement("li");
    prev_li.appendChild(prevButton);
    page_ul.appendChild(prev_li);


    for (let i = startPage; i <= endPage; i++) {
        let new_li = document.createElement("li");
        let new_a = document.createElement("a");
        new_a.href = "javascript:void(0);";
        new_a.textContent = i;
        console.log("page content", new_a.textContent);
        new_a.classList.add("page");
        new_a.onclick = () => {
            currentPage = i;
            offset = (i - 1) * limit;
            get_source_dirs(offset);
        };
        if (i === currentPage) {
            new_a.disabled = true;
        }
        new_li.appendChild(new_a);
        page_ul.appendChild(new_li);

    }

    let next_li = document.createElement("li");
    let next_a = document.createElement("a");
    next_a.textContent = "Next";
    next_a.classList.add("button");
    if (currentPage + pageGroupSize > totalPages)
        next_a.classList.add("disabled");

    next_a.onclick = () => {
        currentPage = Math.min(totalPages, currentPage + pageGroupSize);
        offset = (currentPage - 1) * limit;
        get_source_dirs(offset);
    };

    next_li.appendChild(next_a);
    page_ul.appendChild(next_li);
}
