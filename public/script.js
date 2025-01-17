const api_images = window.location.protocol + "//" + window.location.host + "/api/viewer";
const api_update_view_log = window.location.protocol + "//" + window.location.host + "/api/viewer";
//const html_imgs = document.querySelectorAll(".intro-slideshow img");
const html_img01 = document.getElementById("img01");
const html_img02 = document.getElementById("img02");
const html_title = document.querySelector(".intro h2");
const html_sub_title = document.querySelector(".intro h3");
const html_sub_title_2 = document.querySelector(".intro p");
const days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


let images = [];
let img_counter = 0;
let view_log_enabled = false;
//let toggle_image = 0;

let html_img_current = html_img01;
let html_img_previous = html_img02;

get_images(start_slide_show);

function get_images(callback) {
  console.log("calling", api_images);
  fetch(api_images)
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then(data => {
      images = data;
      console.log(data);
      if (callback)
        callback(data);
    })
    .catch(error => {
      console.error("Error:" + error);
    });
}

function start_slide_show(imgs) {
  html_img01.src = `${window.location.protocol}/api/viewer/${images[img_counter].cache_key}?size=xl`;
  html_img01.data = images[img_counter];
  html_img01.style.opacity = 1;
  html_img_current = html_img01;
  track_image_view();

  step_counter();
  html_img02.src = `${window.location.protocol}/api/viewer/${images[img_counter].cache_key}?size=xl`;
  html_img02.data = images[img_counter];
  html_img02.style.opacity = 0;
  html_img_previous = html_img02;

  set_image_attributes();
  setInterval(next_slide, 10000);
}

function next_slide() {

  console.log(html_img01.style.opacity);
  console.log(html_img02.style.opacity);

  console.log(html_img_current.id, html_img_current.style.opacity, html_img_current.data.filename, html_img_previous.id, html_img_previous.style.opacity, html_img_previous.data.filename);

  if (html_img_current.id == "img01") {
    html_img_current = html_img02;
    html_img_previous = html_img01;
  } else {
    html_img_current = html_img01;
    html_img_previous = html_img02;
  }

  html_img_current.style.opacity = 1;
  html_img_previous.style.opacity = 0;

  step_counter();
  const timestamp = new Date().getTime();
  html_img_previous.src = `${window.location.protocol}/api/viewer/${images[img_counter].cache_key}?size=xl`;
  html_img_previous.data = images[img_counter];

  set_image_attributes();

  track_image_view();

  //toggle_image = toggle_image === 0 ? 1 : 0;
}

function set_image_attributes() {
  set_title();
  set_sub_title();
  set_sub_title_2();
  set_orientation();
}

function set_orientation() {
  let orientation = html_img_current.data.orientation;
  if ((orientation == 6) || (orientation == 8)) {
    html_sub_title_2.textContent = html_sub_title_2.textContent + " rotated|" + html_img_current.id;
    html_img_current.style.rotate = "360deg";
  } else {
    html_img_current.style.removeProperty("rotate");
    html_sub_title_2.textContent = html_sub_title_2.textContent + " not rotated|" + html_img_current.id;
  }
}

function set_title() {
  try {
    let title = html_img_current.data.folder_name;
    title = title.split("/").pop(); //removing slash and taking last folder name. i.e. album name
    title = title.replace(" - ", " ");
    title = title.replace("-", " ");
    title = title.replace("-", " ");
    title = title.replace("_", " ");
    title = title.replace("_", " ");
    html_title.textContent = title;

  } catch (error) {
    console.error(error);
    html_title.textContent = "Memories"
  }
}

/*
{
      "id": 3435,
      "photo_id": 20962,
      "filename": "IMG_20181204_183842.jpg",
      "folder_id": 467,
      "folder_name": "/Family/2018/Dyuman Violine",
      "time": 1543948722,
      "type": "photo",
      "orientation": 1,
      "cache_key": "20962_1734859345",
      "unit_id": 20962,
      "geocoding_id": 22,
      "tags": "",
      "address": "{\"country\":\"United States\",\"country_id\":\"United States\",\"state\":\"North Carolina\",\"state_id\":\"North Carolina\",\"county\":\"Mecklenburg County\",\"county_id\":\"Mecklenburg County\",\"city\":\"\",\"city_id\":\"\",\"town\":\"Matthews\",\"town_id\":\"Matthews\",\"district\":\"\",\"district_id\":\"\",\"village\":\"\",\"village_id\":\"\",\"route\":\"Sam Newell Road\",\"route_id\":\"Sam Newell Road\",\"landmark\":\"\",\"landmark_id\":\"\"}",
      "created_at": "2025-01-16 03:44:18"
  }
*/
function set_sub_title() {
  try {
    let taken_on = new Date(html_img_current.data.time * 1000);
    taken_on = `${days_of_week[taken_on.getDay()]} ${months[taken_on.getMonth()]} ${taken_on.getDate().toString().padStart(2, 0)} ${taken_on.getFullYear()}`;
    html_sub_title.textContent = taken_on;

    let address = "";
    try {
      let city_or_town = "";
      if (html_img_current.data.address.city != "") { //city priority = low
        city_or_town = html_img_current.data.address.city;
      }

      if (html_img_current.data.address.town != "") { //town priority = high
        city_or_town = html_img_current.data.address.town;
      }

      address = `${city_or_town}, ${html_img_current.data.address.country}`;
      html_sub_title.textContent = html_sub_title.textContent + " | " + address;
    } catch {

    }
    
  } catch (error) {
    console.error(error);
    html_sub_title.textContent = "It's all about the journey"
  }
}

function set_sub_title_2() {
  try {
    html_sub_title_2.textContent = html_img_current.data.filename + "|" + html_img_current.data.orientation;
    html_sub_title_2.textContent = html_sub_title_2.textContent + " | + " + JSON.stringify(html_img_current.data.address);
  } catch (error) {
    console.error(error);
    html_sub_title.textContent = "It's all about the journey"
  }
}

function step_counter() {
  img_counter = img_counter + 1
  if (img_counter >= images.length) {
    img_counter = 0;
    // html_imgs[0].style.opacity = 0;
    // html_imgs[1].style.opacity = 0;
    get_images();

  }
}

function track_image_view() {
  if (!view_log_enabled) {
    return;
  }
  fetch(api_update_view_log, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "photo_id": html_img_current.data.photo_id
    })
  })
    .then(response => response.json())
    .then(data => console.log("Success:", data))
    .catch(error => console.error("Error", error));
}