const photo_url = window.location.protocol + "//" + window.location.host + "/api/viewer";
const html_img_photo = document.getElementById("img_photo");
const html_title = document.querySelector(".intro h2");
const html_sub_title = document.querySelector(".intro h3");
const html_sub_title_2 = document.querySelector(".intro p");
const days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

show_photo();
let refresh_client = 10;

document.addEventListener('DOMContentLoaded', function () {
  get_config()
    .then(config_from_server => {      
      if(config_from_server && config_from_server.refresh_client){
        refresh_client = config_from_server.refresh_client;
      }      
      setInterval(function () {
        show_photo();
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

async function get_photo() {
  const response = await fetch(photo_url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const blob = await response.blob();
  return [URL.createObjectURL(blob), response.headers];
}

function show_photo() {
  get_photo()
    .then(object_url_and_headers => {
      html_img_photo.src = object_url_and_headers[0];
      photo_data_obj = JSON.parse(JSON.stringify(object_url_and_headers[1].get("Photo-Data")));
      let photo_data = JSON.parse(photo_data_obj);
      set_image_attributes(photo_data);

      html_img_photo.style.opacity = 0;
      html_img_photo.style.transition = 'opacity 0.5s ease-in-out';

      html_img_photo.onload = () => {
        html_img_photo.style.opacity = 1;
      };
    })
    .catch(error => {
      console.error('Error fetching image:', error);
    });
}

function set_image_attributes(photo_data) {
  if (photo_data == null){
    html_title.textContent = "Memories";
    html_sub_title.textContent = "It's all about the journey";
    html_sub_title_2.textContent = "";
    return;
  }
  set_title(photo_data);
  set_sub_title(photo_data);
  set_sub_title_2(photo_data);
  set_orientation(photo_data);
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

function set_title(photo_data) {
  try {    
    let title = photo_data.folder_name;
    console.log(photo_data);
    title = title.split("/").pop(); //removing slash and taking last folder name. i.e. album name
    title = title.replaceAll(" - ", " ");
    title = title.replaceAll("-", " ");
    title = title.replaceAll("_", " ");
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
function set_sub_title(photo_data) {
  try {
    let taken_on = new Date(photo_data.time * 1000);
    taken_on = `${days_of_week[taken_on.getDay()]} ${months[taken_on.getMonth()]} ${taken_on.getDate().toString().padStart(2, 0)} ${taken_on.getFullYear()}`;
    html_sub_title.textContent = taken_on;

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

      html_sub_title.textContent = html_sub_title.textContent + " | " + address;
    } catch {

    }

  } catch (error) {
    console.error(error);
    html_sub_title.textContent = "It's all about the journey"
  }
}

function set_sub_title_2(photo_data) {
  try {
    html_sub_title_2.textContent = photo_data.filename;
    //html_sub_title_2.textContent = photo_data.folder_name + "/" + photo_data.filename + "|" + photo_data.orientation;
    //html_sub_title_2.textContent = html_sub_title_2.textContent + " | + " + JSON.stringify(photo_data.address);
  } catch (error) {
    console.error(error);
    html_sub_title.textContent = "It's all about the journey"
  }
}
