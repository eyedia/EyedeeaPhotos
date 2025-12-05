function setSlideShowUrlLink() {
    const linkElement = document.getElementById('img_slideshow');
    const baseUrl = window.location.protocol + '//' + window.location.host.split(':')[0] + (window.location.port ? ':' + window.location.port : '');
    linkElement.href = baseUrl;
    linkElement.addEventListener('click', function(event) {
    event.preventDefault();
    window.location.href = this.href;
});
    console.log(`Slide Show URL set to: ${linkElement.href}`);
}

// Call the function on page load
//window.onload = setBaseUrlLink;


document.addEventListener('DOMContentLoaded', async function () {
    setSlideShowUrlLink();
    let pathArray = window.location.pathname.split("/");
    const documentName = pathArray[pathArray.length - 1];
    await get_sources();
    switch (documentName) {
        case "":
        case "index.html":
            save_button_listener();
            get_system_summary();
            break;
        case "player.html":
            get_filters();
            break;
        case "source.html":
            get_source();
            save_button_listener();
            break;
        case "photos.html":
            init_search();
            break;
        default:
            break;
    }


});

function save_button_listener() {
    const add = document.getElementById('add');
    if (!add)
        return;
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
}

async function save_source(url, data) {
    const btn_update = document.getElementById("add");
    const messageDiv = document.getElementById("message");

    try {
        btn_update.classList.add("disabled");
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            btn_update.classList.remove("disabled");
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `HTTP error! Status: ${response.status}`;
            throw new Error(errorMsg);
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
            btn_update.classList.remove("disabled");
            messageDiv.textContent = "Saved successfully";
            messageDiv.className = "message success";
        } else {
            btn_update.classList.remove("disabled");
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
        btn_update.classList.remove("disabled");
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
    const add = document.getElementById("add");
    const messageDiv = document.getElementById("message");

    const nameValue = source_name.value.trim();
    
    // Check name first
    if (!nameValue) {
        add.disabled = true;
        messageDiv.textContent = "Source name is required";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
        return;
    }
    
    if (nameValue.length < 3) {
        add.disabled = true;
        messageDiv.textContent = "Source name must be at least 3 characters long";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
        return;
    }
    
    // Check type
    if (!source_type.value) {
        add.disabled = true;
        messageDiv.textContent = "Please select a source type";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
        return;
    }
    
    // Clear message and check type-specific fields
    messageDiv.classList.add("hidden");
    
    if (source_type.value === 'nas') {
        if (!url.value.trim() || !username.value.trim() || !password.value.trim()) {
            add.disabled = true;
            return;
        }
        add.disabled = !is_valid_url(url.value);
    } else if (source_type.value === 'fs') {
        const directoryValue = directory.value.trim();
        if (!directoryValue) {
            add.disabled = true;
            return;
        }
        add.disabled = !is_valid_dir(directoryValue);
    } else {
        add.disabled = true;
        return;
    }
}


function is_valid_dir(path) {
    // Quick sanity checks first
    if (!path || typeof path !== 'string' || path.length > 500) {
        return false;
    }
    
    // Check if path contains at least one path separator
    if (!/[:\\/]/.test(path)) {
        return false;
    }
    
    // Simplified, non-backtracking regex pattern
    // Matches: C:\path\to\dir, /path/to/dir, \\network\share, ./relative, ~/home
    const pathRegex = /^(?:[a-zA-Z]:\\|\\\\|\/|\.\/|~\/)[^\0<>"|?*]*[^\0<>"|?*/\\]$|^[^\0<>"|?*]*[^\0<>"|?*/\\]$/;
    
    return pathRegex.test(path);
}

function is_valid_url(url) {
    // Quick sanity checks first
    if (!url || typeof url !== 'string' || url.length > 500) {
        return false;
    }
    
    // Simplified, atomic grouping to prevent backtracking
    // Using a more restrictive pattern without nested quantifiers
    const urlRegex = /^https?:\/\/[\w.-]+\.[\w]{2,6}(?:\/[\w./-]*)?$|^[\w.-]+\.[\w]{2,6}(?:\/[\w./-]*)?$/;
    
    return urlRegex.test(url);
}

function toggleFields(do_not_validate) {
    var source_type = document.getElementById("source_type").value;
    document.getElementById("nasFields").classList.toggle("hidden", source_type !== "nas");
    document.getElementById("fsFields").classList.toggle("hidden", source_type !== "fs");
    
    // Load drives when File System is selected
    if (source_type === "fs") {
        loadDrives();
    }
    
    if (!do_not_validate)
        validate_fields();
}

// Drive Browser State
let driveBrowserState = {
    selectedDrive: null,
    loadedDirectories: new Map(), // path -> directories array
    expandedPaths: new Set()
};

// Load available drives from API
async function loadDrives() {
    const driveList = document.getElementById('driveList');
    driveList.innerHTML = '<div class="loading">Loading drives...</div>';
    
    try {
        const response = await fetch('/api/drives');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.drives || data.drives.length === 0) {
            driveList.innerHTML = '<div class="empty-state">No drives found</div>';
            return;
        }
        
        driveList.innerHTML = '';
        data.drives.forEach(drive => {
            const driveItem = createDriveItem(drive);
            driveList.appendChild(driveItem);
        });
    } catch (error) {
        console.error('Error loading drives:', error);
        driveList.innerHTML = '<div class="empty-state">Error loading drives</div>';
    }
}

// Create drive item element
function createDriveItem(drive) {
    const div = document.createElement('div');
    div.className = 'drive-item';
    div.dataset.drivePath = drive.path;
    
    const icon = document.createElement('span');
    icon.className = 'drive-icon';
    icon.textContent = getDriveIcon(drive.type);
    
    const info = document.createElement('div');
    info.className = 'drive-info';
    
    const path = document.createElement('div');
    path.className = 'drive-name';
    path.textContent = drive.path;
    
    info.appendChild(path);
    div.appendChild(icon);
    div.appendChild(info);
    
    div.addEventListener('click', () => selectDrive(drive, div));
    
    return div;
}

// Get icon for drive type
function getDriveIcon(type) {
    switch (type) {
        case 'fixed':
        case 'nvme':
            return '💾';
        case 'removable':
        case 'usb_or_disk':
            return '🔌';
        case 'network':
            return '🌐';
        default:
            return '📁';
    }
}

// Select a drive and load its directories
async function selectDrive(drive, element) {
    // Update UI
    document.querySelectorAll('.drive-item').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
    
    driveBrowserState.selectedDrive = drive;
    driveBrowserState.loadedDirectories.clear();
    driveBrowserState.expandedPaths.clear();
    
    // Load root directories
    await loadDirectories(drive.path);
}

// Load directories for a given path
async function loadDirectories(drivePath, maxDepth = 0) {
    const directoryTree = document.getElementById('directoryTree');
    
    if (maxDepth === 0) {
        directoryTree.innerHTML = '<div class="loading">Loading directories...</div>';
    }
    
    try {
        // Use query parameter to avoid URL encoding issues with slashes
        const encodedPath = encodeURIComponent(drivePath);
        const response = await fetch(`/api/drives/directories?path=${encodedPath}&max_depth=${maxDepth}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (maxDepth === 0) {
            // Root level - replace entire tree
            if (!data.directories || data.directories.length === 0) {
                directoryTree.innerHTML = '<div class="empty-state">No directories found</div>';
                return;
            }
            
            directoryTree.innerHTML = '';
            const ul = document.createElement('ul');
            ul.className = 'directory-tree';
            
            data.directories.forEach(dir => {
                const li = createDirectoryItem(dir);
                ul.appendChild(li);
            });
            
            directoryTree.appendChild(ul);
        }
        
        // Cache the loaded directories
        driveBrowserState.loadedDirectories.set(drivePath, data.directories);
        
        return data.directories;
    } catch (error) {
        console.error('Error loading directories:', error);
        if (maxDepth === 0) {
            directoryTree.innerHTML = '<div class="empty-state">Error loading directories</div>';
        }
        return [];
    }
}

// Create directory item element
function createDirectoryItem(directory, level = 0) {
    const li = document.createElement('li');
    li.className = 'directory-item';
    li.dataset.path = directory.path;
    li.dataset.depth = directory.depth || level;
    
    const header = document.createElement('div');
    header.className = 'directory-item-header';
    
    // Expand icon (+ or -)
    const expandIcon = document.createElement('span');
    expandIcon.className = 'directory-expand-icon';
    expandIcon.innerHTML = '&#9654;'; // Right arrow
    expandIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDirectory(directory, li, expandIcon);
    });
    
    // Folder icon
    const folderIcon = document.createElement('span');
    folderIcon.className = 'directory-icon';
    folderIcon.textContent = '📁';
    
    // Directory name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'directory-name';
    nameSpan.textContent = directory.name;
    nameSpan.title = directory.path;
    
    header.appendChild(expandIcon);
    header.appendChild(folderIcon);
    header.appendChild(nameSpan);
    
    // Click to select directory
    header.addEventListener('click', (e) => {
        if (e.target !== expandIcon) {
            selectDirectory(directory, header);
        }
    });
    
    li.appendChild(header);
    
    // Create container for children
    const childrenUl = document.createElement('ul');
    childrenUl.className = 'directory-children';
    li.appendChild(childrenUl);
    
    return li;
}

// Toggle directory expansion
async function toggleDirectory(directory, liElement, expandIcon) {
    const childrenUl = liElement.querySelector('.directory-children');
    const isExpanded = childrenUl.classList.contains('expanded');
    
    if (isExpanded) {
        // Collapse
        childrenUl.classList.remove('expanded');
        expandIcon.classList.remove('expanded');
        driveBrowserState.expandedPaths.delete(directory.path);
    } else {
        // Expand
        expandIcon.classList.add('loading');
        
        // Load subdirectories
        try {
            const encodedPath = encodeURIComponent(directory.path);
            const response = await fetch(`/api/drives/directories?path=${encodedPath}&max_depth=0`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Clear and populate children
            childrenUl.innerHTML = '';
            
            if (data.directories && data.directories.length > 0) {
                data.directories.forEach(subdir => {
                    const childLi = createDirectoryItem(subdir, (directory.depth || 0) + 1);
                    childrenUl.appendChild(childLi);
                });
                
                childrenUl.classList.add('expanded');
                expandIcon.classList.add('expanded');
                driveBrowserState.expandedPaths.add(directory.path);
            }
        } catch (error) {
            console.error('Error loading subdirectories:', error);
        } finally {
            expandIcon.classList.remove('loading');
        }
    }
}

// Select a directory
function selectDirectory(directory, headerElement) {
    // Update UI
    document.querySelectorAll('.directory-item-header').forEach(header => {
        header.classList.remove('selected');
    });
    headerElement.classList.add('selected');
    
    // Update the directory input field
    const directoryInput = document.getElementById('directory');
    directoryInput.value = directory.path;
    
    // Trigger validation
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
        const sourceSelect = document.getElementById("sourceSelect");
        if (sourceSelect)
            sourceSelect.innerHTML = '<option value="" disabled selected>Select Source</option>';

        ul_nav_sources.innerHTML = "";
        const response = await fetch("/api/sources");
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                add_source_to_nav_menu(item);

                if (sourceSelect) {
                    const option = document.createElement("option");
                    option.value = item.id;
                    option.textContent = item.name;
                    sourceSelect.appendChild(option);
                }

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

let g_source = null;
let dirTable = undefined;
let scanLogTable = undefined;

function setSource(newSource) {
    g_source = newSource;

    if (g_source) {
        dirTable = new PaginatedTable(`/api/sources/${g_source.id}/dirs`, renderTableDirs, 'pagination_dir');
        scanLogTable = new PaginatedTable(`/api/sources/${g_source.id}/scan/logs`, renderTableScanLog, 'pagination_scan_log');
    } else {
        dirTable = undefined;
        scanLogTable = undefined;
    }
}


async function get_source() {
    const id = getQueryParam('id');
    if (!id) return;

    try {
        const response = await fetch(`/api/sources/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const source = await response.json();
        setSource(source);

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
        any_active_scan();        
        if(dirTable) dirTable.fetchData();
        if(scanLogTable) scanLogTable.fetchData();
        
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function renderTableDirs(records) {
    const tableBody = document.getElementById('dirs-table-body');
    tableBody.innerHTML = '';
    records.forEach(item => {
        const a = `<a href='photos.html?source-id=${g_source.id}&source-name=${g_source.name}&dir-id=${item.dir_id}&dir-name=${item.dir}'>`;
        let row = "<tr>";
        // if (window.innerWidth < 425){
        //     row += `<td>${a}${item.dir}</a></td>`
        // }else{
            row += `<td>${item.dir}</td>`
        //}
        row += `<td><a href='photos.html?source-id=${g_source.id}&source-name=${g_source.name}&dir-id=${item.dir_id}&dir-name=${item.dir}'>${item.photos}</a></td>
        </tr>`;

        tableBody.innerHTML += row;
    });
}


function renderTableScanLog(records) {
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
            <td class='hide-mobile'>${item.created_at}</td>
            <td>${item.updated_at}</td>
            <td>${duration}</td>
            <td>${item.total_photos}</td>
            <td>${item.total_dirs}</td>            
        </tr>`;

        tableBody.innerHTML += row;
    });
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


let g_dir_id = 0;
async function get_source_dirs_and_load_to_drop_down(source_id, offset) {
    if (!source_id) {
        console.log("retr")
        return;
    }
    const directorySelect = document.getElementById("directorySelect");
    directorySelect.innerHTML = '<option value="" selected>Select Directory</option>';
    try {
        //directorySelect.disabled = true;
        const apiUrl = `/api/sources/${source_id}/dirs`

        let limit = 1000;
        if (!offset)
            offset = 0;

        fetch(`${apiUrl}?limit=${limit}&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                data.records.forEach(directory => {
                    const option = document.createElement("option");
                    option.value = directory.dir_id;
                    option.textContent = directory.dir;

                    if ((g_dir_id > 0) && (g_dir_id == directory.dir_id)) {
                        option.selected = true;
                    }
                    directorySelect.appendChild(option);
                });
                directorySelect.disabled = false;
            })
            .catch(error => { directorySelect.disabled = true; console.error("Error fetching data:", error) });


    } catch (error) {
        console.error('Error fetching data:', error);
    }
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
                const btn_update = document.getElementById("add");
                const btn_scan = document.getElementById('btn_scan');
                const scan_caption = document.getElementById('scan_caption');
                const scan_loading = document.getElementById("scan_loading");
                
                scan_caption.style.removeProperty("color");
                scan_caption.style.visibility = 'visible';
                btn_scan.classList.add("disabled");
                scan_loading.style.display = "flex"; 
                checkScanLog(data, btn_scan, btn_update, scan_caption);
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
    if (data.summary.total_sources == 1) {
        system_summary.innerHTML = `${data.summary.total_sources} Photo source is configured with ${data.summary.total_photos} photos.`;
    } else if (data.summary.total_sources > 1) {
        system_summary.innerHTML = `${data.summary.total_sources} Photo sources are configured with ${data.summary.total_photos} photos.`;
    }
    
    data.details.forEach(item => {
        const row = `<tr>            
            <td>
                <input type="radio" id="source-select-${item.source_id}" name="source-select" class="source-checkbox" data-source-id="${item.source_id}" data-source-name="${item.name}" onchange="handleSourceCheckboxChange()">
                <label for="source-select-${item.source_id}"></label>
            </td>
            <td><a href='/manage/source.html?id=${item.source_id}'>${item.name}</a></td>
            <td>${item.total_photos}</td>
            <td class='hide-mobile'>${item.last_scanned_at}</td>
        </tr>`;

        tableBody.innerHTML += row;
    });
}

// Handle source checkbox changes - radio buttons enforce single selection
function handleSourceCheckboxChange() {
    const checkedRadio = document.querySelector('.source-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSourceBtn');
    
    // Enable delete button only if a source is selected
    deleteBtn.disabled = !checkedRadio;
}

// Handle delete button click
function handleDeleteClick(event) {
    event.preventDefault();
    
    const checkbox = document.querySelector('.source-checkbox:checked');
    if (!checkbox) {
        return;
    }
    
    const sourceId = checkbox.dataset.sourceId;
    const sourceName = checkbox.dataset.sourceName;
    
    // Store for use in confirmDelete
    window.selectedSourceId = sourceId;
    window.selectedSourceName = sourceName;
    
    // Show confirmation dialog
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete '${sourceName}'?`;
    document.getElementById('deleteError').classList.add('hidden');
    document.getElementById('deleteYesBtn').disabled = false;
    document.getElementById('deleteDialog').showModal();
}

// Confirm and execute delete
async function confirmDelete() {
    const sourceId = window.selectedSourceId;
    const sourceName = window.selectedSourceName;
    const deleteYesBtn = document.getElementById('deleteYesBtn');
    const deleteError = document.getElementById('deleteError');
    
    try {
        deleteYesBtn.disabled = true;
        deleteError.classList.add('hidden');
        
        const response = await fetch(`/api/sources/${sourceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `HTTP error! Status: ${response.status}`;
            throw new Error(errorMsg);
        }
        
        // Success - close dialog and refresh
        document.getElementById('deleteDialog').close();
        
        // Clear selection state and disable delete button
        const deleteBtn = document.getElementById('deleteSourceBtn');
        deleteBtn.disabled = true;
        
        // Refresh data
        get_sources(); // Refresh sidebar menu
        get_system_summary(); // Refresh main table
        
        // Show success notification
        const notification = document.getElementById("notification");
        if (notification) {
            notification.innerText = `Source "${sourceName}" deleted successfully`;
            notification.style.display = "block";
            notification.className = "message success";
            setTimeout(() => {
                notification.classList.add("hidden");
                setTimeout(() => {
                    notification.style.display = "none";
                    notification.style.opacity = "1";
                }, 1000);
            }, 5000);
        }
        
    } catch (error) {
        console.error("Error deleting source:", error.message);
        deleteError.textContent = `Error: ${error.message}`;
        deleteError.className = "message error";
        deleteError.classList.remove("hidden");
        deleteYesBtn.disabled = false;
    }
}


async function get_filters(triggered_by_page_a, offset) {
    try {
        const btn_add_filter = document.getElementById("btn_add_filter");
        const apiUrl = `/api/view/filters`
        let limit = 10;
        if (!offset)
            offset = 0;
        fetch(`${apiUrl}?limit=${limit}&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                renderTableFilters(data);
                if ((data.length == 1) && (data[0].total_photos == 0)) {
                    //very first time, when nothing was set or scanned                    
                    btn_add_filter.classList.add("disabled");
                } else {
                    btn_add_filter.classList.remove("disabled");
                }
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
                <input type="radio" id="demo-priority-${item.id}" name="demo-priority" ${item.current == 1 ? "checked" : ""}>
                <label for="demo-priority-${item.id}">${item.name}</label>                
            </td>
            <td>${item.keyword}</td>
            <td>${item.total_photos}</td>            
            <td>${item.id == 0 ? '' : `<a href='#' onclick=deleteFilter(this) data-id=${item.id}>delete</a>`}</td>
        </tr>`;

        tableBody.innerHTML += row;
    });

    document.querySelectorAll('input[name="demo-priority"]').forEach(radio => {
        radio.addEventListener("change", function () {
            const selectedValue = this.value;
            const rad_id = this.id.replace("demo-priority-", "")
            console.log(rad_id);
            const url = rad_id == "0" ? "/api/view/filters/active" : `/api/view/filters/${rad_id}/active`
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
            window.location.href = "photos.html?keywords=" + encodeURIComponent(g_search);
        }
    }
}

function init_search() {
    /* Can be triggered from:

    player.html > searchBox
    photos.html > g_searchBox
    photos.html > browse directory
    global search top left > photos.html > g_searchBox
    source.html > show dir photos > g-search-dir
    */

    //from global search
    const keywords = getQueryParam('keywords');
    const source_id = getQueryParam('source-id');
    const source_name = getQueryParam('source-name');
    const dir_id = getQueryParam('dir-id');
    const dir_name = getQueryParam('dir-name');
    if (keywords != null) {
        let g_search_text = document.getElementById("g_search_keywords");
        if (g_search_text)
            g_search_text.value = keywords;

        const g_searchBox = document.getElementById('g-search-searchBox');
        if (g_searchBox)
            g_searchBox.value = keywords;
    }
    
    //toggleSearchBox(dir_name, source_name);
    const dir = dir_id ? { source_id: source_id, source_name: source_name, dir_id: dir_id, dir_name: dir_name } : undefined;
    
    if ((keywords != null) || (dir)){        
        toggleSearchBox(dir);    
        search(dir);
    }
}

function toggleSearchBox(dir) {

    if (dir) {
        g_dir_id = dir.dir_id;

        const radio = document.getElementById("demo-priority-browse")
        radio.checked = true;

        const sourceSelect = document.getElementById('sourceSelect');
        sourceSelect.value = dir.source_id;

        const event = new Event('change', { bubbles: true });
        radio.dispatchEvent(event);
        sourceSelect.dispatchEvent(event);

    } else {
        const radio = document.getElementById("demo-priority-search")
        radio.checked = true;
    }
}


function show_notification(message, is_error){
    const notification = document.getElementById("notification");
    notification.innerText = message;
    notification.style.display = "block";
    notification.className = "message success";
    let show_duration = 5000;
    let opacity_duration = 1000;
    if(is_error){
        notification.className = "message error";
        show_duration = 10000;
    }
            setTimeout(() => {                
                notification.classList.add("hidden");
                setTimeout(() => {
                    notification.style.display = "none";
                    notification.style.opacity = "1";
                }, opacity_duration);
            }, show_duration);
}

let currently_viewing = null;
function viewImage(event) {
    if (!sidebar.classList.contains('inactive'))
        sidebar.classList.add('inactive');
    
    viewer.style.display = 'flex';
    const photo_data = JSON.parse(event.target.getAttribute('photo-data'));
    currently_viewing = event.target;
    updateImage(photo_data.photo_id);
}