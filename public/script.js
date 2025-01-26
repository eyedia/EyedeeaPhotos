const api_images = window.location.protocol + "//" + window.location.host + "/api/viewer";
const html_img01 = document.getElementById("img01");
const html_img02 = document.getElementById("img02");
const html_title = document.querySelector(".intro h2");
const html_sub_title = document.querySelector(".intro h3");
const html_sub_title_2 = document.querySelector(".intro p");
const days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


//setInterval(next_slide, 10000);
//setInterval(displayImageWithTransition, 10000);

displayImageWithTransition();

setTimeout(function(){
  window.location.reload(1);
}, 10000);

function displayImageWithTransition() {
  let imageUrl = "http://127.0.0.1:8080/api/viewer/next";
  //get_photo_data();
  html_img01.src = imageUrl;
  html_img01.style.opacity = 0; // Initially hide the image
  html_img01.style.transition = 'opacity 0.5s ease-in-out'; // Set transition effect

  // Fade in the image after it's loaded
  html_img01.onload = () => {
    html_img01.style.opacity = 1; 
  };
}


async function get_photo_data() {
  const url = "http://127.0.0.1:8080/api/viewer/next/data";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    console.log(JSON.stringify(json));
  } catch (error) {
    console.error(error.message);
  }
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
  fetch(api_images, {
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