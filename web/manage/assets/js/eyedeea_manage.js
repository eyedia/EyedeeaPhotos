document.addEventListener('DOMContentLoaded', function () {
    let pathArray = window.location.pathname.split("/");
    const documentName = pathArray[pathArray.length - 1];
    switch (documentName) {
        case "":
        case "index.html":
            const add = document.getElementById('add');
            add.addEventListener('click', function (event) {
                const data = (() => {
                    const source_type = document.getElementById("source_type").value;
                    const source_name = document.getElementById("source_name");
                    const url = document.getElementById("url");
                    const username = document.getElementById("username");
                    const password = document.getElementById("password");
                    const directory = document.getElementById("directory");

                    if (source_type === "nas") {
                        return {
                            "name": source_name.value,
                            "type": source_type,
                            "url": url.value,
                            "user": username.value,
                            "password": password.value
                        };
                    } else {
                        return {
                            "name": source_name.value,
                            "type": source_type,
                            "url": directory.value
                        };
                    }
                })();
                save_source('/api/sources', data);
            });
            get_system_summary();
            break;
        case "player.html":
            get_filters();
            break;
        case "source.html":
            get_source();
            break;
        case "search.html":
            init_search();
            break;
        default:
            break;
    }
    get_sources();
    
});

async function save_source(url, data) {
    const messageDiv = document.getElementById("message");

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();

        let error_message = "";
        if (responseData.authenticate && responseData.authenticate.error) {
            error_message = responseData.authenticate.error.message;
        }
        if (response.status == 201) {
            get_sources();  //refesh nav menu           
        }

        if (error_message && error_message.code) {
            error_message = `Saved successfully! But check your config. Eyedeea Photos could not communicate with the server. <br>${error_message.code}: ${error_message.message}`;
        }
        if ((response.status === 201 || response.status === 200) && !error_message) {
            if (response.status === 201) {
                window.location.href = `source.html?id=${responseData.id}`;
            }
            messageDiv.textContent = "Saved successfully";
            messageDiv.className = "message success";
        } else {
            messageDiv.innerHTML = error_message;
            messageDiv.className = "message error";
            return;
        }

        messageDiv.classList.remove("hidden");
        setTimeout(() => {
            messageDiv.classList.add("hidden");
            const dialog = document.getElementById('dialog');
            if (dialog)
                dialog.close();
        }, 5000);

        return responseData;
    } catch (error) {
        console.error("Error:", error.message);
        messageDiv.textContent = error.message;
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
    }
}


function validate_fields() {
    const source_name = document.getElementById("source_name");
    const source_type = document.getElementById("source_type");
    const url = document.getElementById("url");
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const directory = document.getElementById("directory");
    const add = document.getElementById("add"); // Ensure the "add" button exists in your HTML

    if (!source_name.value.trim() || !source_type.value) {
        add.disabled = true;
        return;
    }
    if (source_type.value === 'nas') {
        if (!url.value.trim() || !username.value.trim() || !password.value.trim()) {
            add.disabled = true;
            return;
        }
        add.disabled = !is_valid_url(url.value);
        add.disabled = false;
    } else if (source_type.value === 'fs') {
        if (!directory.value.trim()) {
            add.disabled = true;
            return;
        }
        add.disabled = !is_valid_dir(directory.value);
        add.disabled = false;
    } else {
        add.disabled = true;
        return;
    }
}


function is_valid_dir(path) {
    const first_check = /[:/\\/]/.test(path);
    if (!first_check) return false;
    const pathRegex = /^(?:[a-zA-Z]:\\|\\\\|\/|\.\/|~\/)?(?:[\w.-]+[\\\/])*[\w.-]+$/;
    return pathRegex.test(path);
}
function is_valid_url(url) {
    const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,6})([\/\w .-]*)*\/?$/i;
    return urlRegex.test(url);
}

function toggleFields(do_not_validate) {
    var source_type = document.getElementById("source_type").value;
    document.getElementById("nasFields").classList.toggle("hidden", source_type !== "nas");
    document.getElementById("fsFields").classList.toggle("hidden", source_type !== "fs");
    if (!do_not_validate)
        validate_fields();
}


function add_source_to_nav_menu(source) {
    let ul_nav_sources = document.getElementById("nav_sources");
    let newLi = document.createElement("li");
    let newAnchor = document.createElement("a");
    newAnchor.href = `source.html?id=${source.id}`;
    newAnchor.textContent = source.name;
    newLi.appendChild(newAnchor);
    ul_nav_sources.appendChild(newLi);

}

async function get_sources() {
    try {
        let ul_nav_sources = document.getElementById("nav_sources");
        ul_nav_sources.innerHTML = "";
        const response = await fetch("/api/sources");
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                add_source_to_nav_menu(item);
            });
        } else {
            console.log("Received data is not an array:", data);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

let g_source = null
async function get_source() {
    const id = getQueryParam('id');
    if (!id) return;

    try {
        const response = await fetch(`/api/sources/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const source = await response.json();
        g_source = source;

        const source_name = document.getElementById('source_name');
        const source_type = document.getElementById('source_type');
        const url = document.getElementById('url');
        const directory = document.getElementById('directory');
        const username = document.getElementById("username");
        const title = document.getElementById("title");

        if (source_name) source_name.value = source.name;
        if (source_type) source_type.value = source.type;
        if (url && source.type === "nas") url.value = source.url;
        if (directory && source.type === "fs") directory.value = source.url;
        if (username && source.user) username.value = source.user;
        if (title) title.innerText = `Source: ${source.name}`;

        toggleFields(true);
        get_source_latest_scan_data();
        get_scan_logs();
        any_active_scan();
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function get_source_latest_scan_data() {
    const id = getQueryParam('id'); // Get 'id' from the URL query string    
    const total_photos = document.getElementById('total_photos');
    const total_dirs = document.getElementById('total_dirs');
    const last_scanned = document.getElementById('last_scanned');
    if (!id) {
        return;
    }
    try {
        const response = await fetch(`/api/sources/${id}/scan/logs?latest=true`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.length > 0) {
            total_photos.innerText = data[0].total_photos;
            total_dirs.innerText = data[0].total_dirs;
            //total_geo_apis.innerText = data[0].total_geo_apis;
            last_scanned.innerText = data[0].updated_at;
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function get_scan_logs(triggered_by_page_a, offset) {
    if (g_source == null) {
        console.log("retr")
        return;
    }
    try {
        const apiUrl = `/api/sources/${g_source.id}/scan/logs`
        let limit = 10;
        if (!offset)
            offset = 0;
        fetch(`${apiUrl}?limit=${limit}&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                renderTable(data.records);
                renderPagination(data.total_records, data.total_pages, data.current_offset, limit, triggered_by_page_a);
            })
            .catch(error => console.error("Error fetching data:", error));


    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderTable(records) {
    const tableBody = document.getElementById("scan-logs-table-body");
    tableBody.innerHTML = '';

    records.forEach(item => {
        let duration = "N/A";
        if (item.updated_at && item.updated_at != "N/A") {
            const createdAt = new Date(item.created_at);
            const updatedAt = new Date(item.updated_at);
            const durationMs = updatedAt - createdAt;
            const str_duration = new Date(durationMs).toISOString()
            duration = str_duration.substring(11, str_duration.length - 5); // Converts to HH:mm:ss
        }

        const row = `<tr>            
            <td>${item.created_at}</td>
            <td>${item.updated_at}</td>
            <td>${duration}</td>
            <td>${item.total_photos}</td>
            <td>${item.total_dirs}</td>
            <td>${item.total_geo_apis}</td>
        </tr>`;

        tableBody.innerHTML += row;
    });
}

function renderPagination(total_records, total_pages, current_offset, limit, triggered_by_page_a) {
    let page_ul = document.getElementById("pagination");
    page_ul.innerHTML = "";
    for (let i = 0; i < total_pages; i++) {
        let new_li = document.createElement("li");
        let new_a = document.createElement("a");
        new_a.href = "javascript:void(0);";
        new_a.textContent = i + 1;
        new_a.classList.add("page");
        new_a.onclick = (event) => {
            event.preventDefault();
            get_scan_logs(event.currentTarget, i * limit);
        }
        new_li.appendChild(new_a);
        page_ul.appendChild(new_li);

    }
    if (triggered_by_page_a)
        set_active_page_no(triggered_by_page_a.parentElement.textContent)
    else
        set_active_page_no("1");
}


function set_active_page_no(page_no) {
    let page_ul = document.getElementById("pagination");
    const listItems = page_ul.getElementsByTagName("li");
    for (let item of listItems) {
        if (item.textContent == page_no)
            item.childNodes[0].classList.add("active");
        else
            item.childNodes[0].classList.remove("active");
    }

}

async function scan() {
    if (!g_source) {
        console.log("Source is null.");
        return;
    }

    const btn_scan = document.getElementById('btn_scan');
    const scan_caption = document.getElementById('scan_caption');

    try {
        const response = await fetch(`/api/sources/${g_source.id}/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.message) {
            console.error(data.message);
            error_message = ""
            if (data.message && data.message.error.code) {
                error_message = `Saved successfully! But check your config. Eyedeea Photos could not communicate with the server. <br>${data.message.error.code}: ${data.message.error.code}`;
            } else if (data.message) {
                error_message = data.message;
            }
            scan_caption.innerText = `Scanning could not be started. ${error_message}`;
            scan_caption.style.color = "red";
            scan_caption.style.visibility = 'visible';
            setTimeout(() => scan_caption.style.visibility = 'hidden', 10000);
        } else {
            scan_caption.style.removeProperty("color");
            scan_caption.style.visibility = 'visible';
            show_count_down_refresh_timer(data, btn_scan, scan_caption);
            btn_scan.classList.add("disabled");
            get_scan_logs();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function show_count_down_refresh_timer(data, btn_scan, scan_caption) {
    let timeLeft = g_source.type == "nas" ? 60 : 30;  //seconds
    const countdownInterval = setInterval(async function () {
        if (timeLeft >= 0) {
            let formatted_time_left = formatDuration(timeLeft);
            scan_caption.innerText = `Scanning started; scan log id: ${data.scan_log_id}. Refreshing in ${formatted_time_left}`;
            timeLeft--;
        } else {
            clearInterval(countdownInterval);
            scan_caption.innerText = `Scanning started; scan log id: ${data.scan_log_id}. Refreshing...`;

            try {
                const response = await fetch(`/api/sources/${g_source.id}/scan/logs/${data.scan_log_id}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const current_scan_log = await response.json();

                if (current_scan_log && current_scan_log.updated_at) {
                    btn_scan.classList.remove("disabled");
                    scan_caption.style.visibility = 'hidden';
                    scan_caption.innerText = "";
                    get_scan_logs();
                    get_source_latest_scan_data();
                } else {
                    show_count_down_refresh_timer(data, btn_scan, scan_caption);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }
    }, 1000);
}

function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "Invalid input";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let formattedTime = [];
    if (hours > 0) formattedTime.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) formattedTime.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (secs > 0 || formattedTime.length === 0) formattedTime.push(`${secs} second${secs !== 1 ? 's' : ''}`);

    return formattedTime.join(", ");
}


async function any_active_scan() {
    const id = getQueryParam('id');
    if (!id) {
        return;
    }
    try {
        const response = await fetch(`/api/sources/${id}/scan`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const scan_details = await response.json();
        if (scan_details) {
            if (scan_details.active && scan_details.scan_log) {
                let data = {
                    "scan_log_id": scan_details.scan_log.id
                }
                const btn_scan = document.getElementById('btn_scan');
                const scan_caption = document.getElementById('scan_caption');
                scan_caption.style.removeProperty("color");
                scan_caption.style.visibility = 'visible';
                btn_scan.classList.add("disabled");
                show_count_down_refresh_timer(data, btn_scan, scan_caption);
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function get_system_summary(triggered_by_page_a, offset) {
    try {
        const apiUrl = `/api/system`
        let limit = 10;
        if (!offset)
            offset = 0;
        fetch(`${apiUrl}?limit=${limit}&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                renderTableSummary(data);
                //renderPagination(data.total_records, data.total_pages, data.current_offset, limit, triggered_by_page_a);
            })
            .catch(error => console.error("Error fetching data:", error));


    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderTableSummary(data) {
    const tableBody = document.getElementById("source-summary-table-body");
    tableBody.innerHTML = '';

    const system_summary = document.getElementById("system_summary");
    if (data.summary.total_sources == 1){
        system_summary.innerHTML = `${data.summary.total_sources} Photo source is configured with ${data.summary.total_photos} photos.`;
    }else if (data.summary.total_sources > 1){
        system_summary.innerHTML = `${data.summary.total_sources} Photo sources are configured with ${data.summary.total_photos} photos.`;
    }

    data.details.forEach(item => {
        const row = `<tr>            
            <td><a href='/manage/source.html?id=${item.source_id}'>${item.name}</a></td>
            <td>${item.total_photos}</td>
            <td>${item.last_scanned_at}</td>
        </tr>`;

        tableBody.innerHTML += row;
    });
}


async function get_filters(triggered_by_page_a, offset) {
    try {
        const apiUrl = `/api/view/filters`
        let limit = 10;
        if (!offset)
            offset = 0;
        fetch(`${apiUrl}?limit=${limit}&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                renderTableFilters(data);
                //renderPagination(data.total_records, data.total_pages, data.current_offset, limit, triggered_by_page_a);
            })
            .catch(error => console.error("Error fetching data:", error));


    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderTableFilters(data) {
    const tableBody = document.getElementById("player-filter-table-body");
    tableBody.innerHTML = '';

    //const system_summary = document.getElementById("system_summary");
    //system_summary.innerHTML = `${data.summary.total_sources} Photo sources are configured with ${data.summary.total_photos} photos.`;

    data.forEach(item => {
        const row = `<tr>       
            <td>
                <input type="radio" id="demo-priority-${item.id}" name="demo-priority" ${item.current == 1? "checked": ""}>
                <label for="demo-priority-${item.id}">${item.name}</label>                
            </td>
            <td>${item.keyword}</td>
            <td>${item.total_photos}</td>            
            <td>${item.id ==0? '': `<a href='#' onclick=deleteFilter(this) data-id=${item.id}>delete</a>`}</td>
        </tr>`;

        tableBody.innerHTML += row;
    });

    document.querySelectorAll('input[name="demo-priority"]').forEach(radio => {
        radio.addEventListener("change", function () {
            const selectedValue = this.value;
            const rad_id = this.id.replace("demo-priority-", "")
            console.log(rad_id);
            const url = rad_id == "0"? "/api/view/filters/active" : `/api/view/filters/${rad_id}/active`
            fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then(response => response.json())
            .then(data => show_notification(`You have activated a filter. These changes will take effect within a few minutes.`))
            .catch(error => console.error("Error:", error));
        });
    });
}

const deleteFilter = async (a_element) => {
    try {
        const filter_id = a_element.getAttribute("data-id");
        await fetch(`/api/view/filters/${filter_id}`, {
            method: 'DELETE'
        });
        get_filters(undefined, 0);
        show_notification("Filter deleted!");
    } catch (error) {
        console.error('Error deleting filter:', error);
    }
};

function g_search_entery_key(event) {
    if (event.key === "Enter") {
        let g_search = document.getElementById("g_search_keywords").value;
        if (g_search.trim() !== "") {
            window.location.href = "search.html?keywords=" + encodeURIComponent(g_search);
        }
    }
}

function init_search(){
    const keywords = getQueryParam('keywords');
    let g_search_text = document.getElementById("g_search_keywords");
    if(g_search_text)
        g_search_text.value = keywords;

    const g_searchBox = document.getElementById('g-search-searchBox');
    if(g_searchBox)
        g_searchBox.value = keywords;

    search();
    console.log(keywords);
}