const days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const photo_url = window.location.protocol + "//" + window.location.host + "/api/viewer";
const e_thumbnails = document.getElementById("thumbnails");
//let auto_refreshed = "api/viewer";
let toggle = 0;
top_init();
refresh_pic();
let refresh_client = 10;

{/* <article>
    <a class="thumbnail" href="images/fulls/09.jpg"><img src="images/thumbs/09.jpg" alt="" /></a>
    <h2>Morbi eget vitae adipiscing</h2>
    <p>In quis vulputate dui. Maecenas metus elit, dictum praesent lacinia lacus.</p>
</article> */}

document.addEventListener('DOMContentLoaded', function () {
    get_config()
        .then(config_from_server => {
            if (config_from_server && config_from_server.refresh_client) {
                refresh_client = config_from_server.refresh_client;
            }
            setInterval(function () {
                refresh_pic();
            }, refresh_client * 1000);
        });


});

async function get_config() {
    return fetch(photo_url + "/config")
        .then(response => response.json())
        .then(data => {
            return data;
        });
}


function refresh_pic() {
    // if (auto_refreshed == "PAUSE") {
    //     return;
    // }
    console.log("refreshing...");
    refresh_history();
    // get_photo()
    //     .then(object_url_and_headers => {
    //         //html_img_photo.src = object_url_and_headers[0];
    //         let photo_data_obj = JSON.parse(JSON.stringify(object_url_and_headers[1].get("Photo-Data")));
    //         let photo_data = JSON.parse(photo_data_obj);
    //         refresh_history();

    //     })
    //     .catch(error => {
    //         console.error('Error fetching image:', error);
    //     });
}

function refresh_history() {

    e_thumbnails.innerHTML = "";
    const element = document.getElementById("viewer");
    if (element) {
    element.remove(); 
    }
    //removeScript("/assets/js/main.js");
    //removeScript("/assets/js/breakpoints.min.js");

    var total = 12;
    var count = 0;

    for (i = 0; i < total; i++) {
        (function (foo) {
            const e_article = document.createElement('article');
            get_photo(foo).then(object_url_and_headers => {

                const e_a = document.createElement('a');
                e_a.setAttribute("id", `a-${String(foo + 1).padStart(2, '0')}`);
                e_a.setAttribute("class", "thumbnail");
                e_a.setAttribute("href", object_url_and_headers[0]);

                const e_img = document.createElement('img');
                e_img.setAttribute("id", `img-${String(foo + 1).padStart(2, '0')}`);
                e_img.setAttribute("src", object_url_and_headers[0]);
                e_a.appendChild(e_img);

                const e_h2 = document.createElement('h2');
                e_h2.setAttribute("id", `h2-${String(foo + 1).padStart(2, '0')}`);

                const e_h3 = document.createElement('h3');
                e_h3.setAttribute("id", `h3-${String(foo + 1).padStart(2, '0')}`);

                const e_p = document.createElement('p');
                e_p.setAttribute("id", `p-${String(foo + 1).padStart(2, '0')}`);

                let photo_data_obj = JSON.parse(JSON.stringify(object_url_and_headers[1].get("Photo-Data")));
                let photo_data = JSON.parse(photo_data_obj);
                set_image_attributes(photo_data, e_h2, e_h3, e_p);

                e_article.appendChild(e_a);
                e_article.appendChild(e_h2);
                e_article.appendChild(e_h3);
                e_article.appendChild(e_p);

                e_thumbnails.appendChild(e_article);
                count++;
                if (count > total - 1){
                    //addScript("assets/js/main.js");
                    top_init();
                    }

            })
            .catch(error => {
                console.error('Error fetching image:', error);
            });
        }(i));

    }

}


async function get_photo(photo_index) {
    let local_photo_url = photo_url
    if (photo_index) {
        local_photo_url = local_photo_url + `?photo_index=${photo_index}`;
    }
    //console.log(`calling...${local_photo_url}`)
    const response = await fetch(local_photo_url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return [URL.createObjectURL(blob), response.headers];
}


function set_image_attributes(photo_data, e_title, e_sub_title, e_sub_title2) {
    if (photo_data == null) {
        e_title.textContent = "Memories";
        e_sub_title.textContent = "It's all about the journey";
        //html_sub_title_2.textContent = "";
        return;
    }
    set_title(photo_data, e_title);
    set_sub_title(photo_data, e_sub_title);
    set_sub_title_2(photo_data, e_sub_title2);
    //set_orientation(photo_data);
}


function set_title(photo_data, e_title) {
    try {
        let title = photo_data.folder_name;
        title = title.split("/").pop(); //removing slash and taking last folder name. i.e. album name
        title = title.replaceAll(" - ", " ");
        title = title.replaceAll("-", " ");
        title = title.replaceAll("_", " ");
        e_title.textContent = title;

    } catch (error) {
        console.error(error);
        e_title.textContent = "Memories"
    }
}

function set_sub_title(photo_data, e_sub_title) {
    try {
        let taken_on = new Date(photo_data.time * 1000);
        taken_on = `${days_of_week[taken_on.getDay()]} ${months[taken_on.getMonth()]} ${taken_on.getDate().toString().padStart(2, 0)} ${taken_on.getFullYear()}`;
        e_sub_title.textContent = taken_on;

        let address = "";
        try {
            let city_or_town = "";
            if (photo_data.address.city != "") { //city priority = low
                city_or_town = photo_data.address.city;
            }

            if (photo_data.address.town != "") { //town priority = high
                city_or_town = photo_data.address.town;
            }

            if (city_or_town == "") { //if still blank, then county
                city_or_town = photo_data.address.county;
            }

            if (city_or_town == "") { //if still blank, then state
                city_or_town = photo_data.address.state;
            }

            if (city_or_town != "")
                address = `${city_or_town}, ${photo_data.address.country}`;
            else
                address = photo_data.address.country;

            e_sub_title.textContent = html_sub_title.textContent + " | " + address;
        } catch {

        }

    } catch (error) {
        console.error(error);
        e_sub_title.textContent = "It's all about the journey"
    }
}


function set_sub_title_2(photo_data, e_sub_title2) {
    try {
        e_sub_title2.textContent = photo_data.filename;
      //html_sub_title_2.textContent = photo_data.folder_name + "/" + photo_data.filename + "|" + photo_data.orientation;
      //html_sub_title_2.textContent = html_sub_title_2.textContent + " | + " + JSON.stringify(photo_data.address);
    } catch (error) {
      console.error(error);
      e_sub_title2.textContent = "It's all about the journey"
    }
  }
  

function set_orientation(photo_data) {
    let orientation = photo_data.orientation;
    if ((orientation == 6) || (orientation == 8)) {
        html_img_photo.style.rotate = "360deg";
        html_img_photo.style.setProperty("object-position", "top 30% right 0px");
    } else {
        html_img_photo.style.removeProperty("rotate");
        html_img_photo.style.setProperty("object-position", "50% 50%");
    }
}

function removeScript(scriptSrc) {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
        if (script.src.endsWith(scriptSrc)) {
            script.remove();
        }
    }
}

function addScript(scriptSrc) {
    
    const script = document.createElement("script");
    script.src = scriptSrc;
    document.head.appendChild(script);

}
