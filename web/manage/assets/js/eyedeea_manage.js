let ul_nav_sources = document.getElementById("nav_sources");  
let nav_sources_ctr = document.getElementById("nav_sources_ctr");  
let title = document.getElementById("title"); 
const add = document.getElementById('add');
const source_type = document.getElementById('source_type');
const google_api_key = document.getElementById('google_api_key');
const name = document.getElementById('name');
const url = document.getElementById('url');
const user_name = document.getElementById('user_name');
const password = document.getElementById('password');


add.addEventListener('click', function (event) {
    const data = {
        "name": name.value,
        "type": source_type.value,
        "url": url.value,
        "user": user_name.value,
        "password": password.value
    }
    save_source('/api/sources', data);
});

source_type.addEventListener('change', function (event) {
    if (event.target.value === 'fs') {
        google_api_key.style.visibility = 'visible';
        url.placeholder = "D:\\My_Photos";
        user_name.placeholder = "User Name(Optional)";
        password.placeholder = "Password(Optional)";
    } else {
        google_api_key.style.visibility = 'hidden';
        url.placeholder = "https://SYNOLOGY-IP:5001/webapi";
        user_name.placeholder = "User Name";
        password.placeholder = "Password";
    }
    validate_fields();
});

async function save_source(url, data) {
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
        if ((response.status == 201) || (response.status == 200)) {
            console.log('New source has been registered with id:', responseData.id);
            toggle_message(true, "Saved successfully!", responseData.authenticate.auth_status);
            setTimeout(function () { toggle_message(); }, 5000);
        }
        return responseData;
    } catch (error) {
        console.error('Error:', error.message);
        toggle_message(true, error.message, "Failed");
        setTimeout(function () { toggle_message(); }, 5000);
    }
}

function validate_fields() {
    if ((name.value.trim() === "") || (url.value.trim() === "") || (source_type.value === '')) {
        add.disabled = true;
        return;
    }
    if (source_type.value === 'nas') {
        if ((user_name.value.trim() === "") || (password.value.trim() === "")) {
            add.disabled = true;
            return;
        }
        add.disabled = !is_valid_url(url.value);
        return;
    } else {
        add.disabled = !is_valid_dir(url.value);
        return;
    }
    add.disabled = false;
}

function is_valid_dir(path) {
    const first_check = /[:/\\/]/.test(path);
    if(!first_check) return false;
    console.log(first_check);
    const pathRegex = /^(?:[a-zA-Z]:\\|\\\\|\/|\.\/|~\/)?(?:[\w.-]+[\\\/])*[\w.-]+$/;
    return pathRegex.test(path);
}
function is_valid_url(url) {    
    const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,6})([\/\w .-]*)*\/?$/i;
    return urlRegex.test(url);        }


function toggle_message(show, msg_text, auth_status) {
    console.log(msg_text, auth_status)
    const div_msg = document.getElementById('div_msg');
    const msg = document.getElementById('msg');
    const auth_status_caption = document.getElementById('auth_status_caption');
    const auth_status_value = document.getElementById('auth_status_value');
    console.log(msg.hidden)
    if (show) {
        msg.textContent = msg_text;
        div_msg.style.visibility = 'visible';
    } else {
        msg.textContent = "";
        div_msg.style.visibility = 'hidden';
        auth_status_value.style.color = "limegreen";
    }

    if (auth_status == true) {
        auth_status_value.textContent = "Success";
        auth_status_value.style.color = "limegreen";
    } else {
        auth_status_value.textContent = "Failed";
        auth_status_value.style.color = "crimson";
    }
}

function add_source_to_nav_menu(source) {              
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

async function get_source() {
    const id = getQueryParam('id'); // Get 'id' from the URL query string
    if (!id) {
        return;
    }    
    try {
        const response = await fetch(`/api/sources/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const source = await response.json();
        console.log(source);
        name.value = source.name;
        source_type.value = source.type;
        url.value = source.url;
        user_name.value = source.user;
        title.innerText = `Source: ${source.name}`;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
