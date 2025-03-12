document.addEventListener('DOMContentLoaded', function () {
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
                    "url": directory.value // Should this be "directory" instead of "url"?
                };
            }
        })();  
        save_source('/api/sources', data);
    });
    get_sources();
    get_source();
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
        console.log(response.status);
        if ((response.status === 201 || response.status === 200) && !error_message) {
            messageDiv.textContent = "Saved successfully";
            messageDiv.className = "message success";
        } else {
            messageDiv.textContent = error_message;
            messageDiv.className = "message error";
        }

        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 5000);

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

    // General validation
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
    } else if (source_type.value === 'fs') {
        if (!directory.value.trim()) {
            add.disabled = true;
            return;
        }
        add.disabled = !is_valid_dir(directory.value);
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
    const id = getQueryParam('id'); // Get 'id' from the URL query string
    const source_name = document.getElementById('source_name');
    const source_type = document.getElementById('source_type');
    const url = document.getElementById('url');
    const directory = document.getElementById('directory');
    const username = document.getElementById("username");
    let title = document.getElementById("title");
    if (!id) {
        return;
    }
    try {
        const response = await fetch(`/api/sources/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const source = await response.json();
        g_source = source;
        console.log(source);
        source_name.value = source.name;
        source_type.value = source.type;
        url.value = source.url;
        if(source.user)
            username.value = source.user;
        directory.value = source.url;
        title.innerText = `Source: ${source.name}`;
        toggleFields(true);
        get_source_latest_scan_data();
        get_scan_logs();
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

    const tableBody = document.getElementById('scan-logs-table-body');
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
    if (g_source == null) {
        console.log("retr")
        return;
    }
    const btn_scan = document.getElementById('btn_scan');
    const scan_caption = document.getElementById('scan_caption');
    await fetch(`/api/sources/${g_source.id}/scan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            return response.json();
        })
        .then(data => {
            if ("message" in data) {
                console.error(data);
                scan_caption.innerText = `Scanning could not be started. ${data.message}`
                scan_caption.style.color = "red";
                scan_caption.style.visibility = 'visible';
                setTimeout(function () { scan_caption.style.visibility = 'hidden'; }, 10000);
            } else {
                scan_caption.style.removeProperty("color");
                scan_caption.style.visibility = 'visible';
                show_count_down_refresh_timer(data, btn_scan, scan_caption);
                btn_scan.classList.add("disabled");

                get_scan_logs();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    //const responseData = await response.json();


}

function show_count_down_refresh_timer(data, btn_scan, scan_caption) {
    let timeLeft = g_source.type =="nas"?300:30;  //seconds
    const countdownInterval = setInterval(async function () {
        if (timeLeft >= 0) {
            //countdownElement.textContent = timeLeft;
            scan_caption.innerText = `Scanning started; scan log id: ${data.scan_log_id}. Refreshing in ${timeLeft}`;
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
