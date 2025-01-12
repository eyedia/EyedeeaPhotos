const api_images = window.location.protocol + "//" + window.location.host + "/photos";
const html_imgs = document.querySelectorAll(".intro-slideshow img");
const html_title = document.querySelector(".intro h1");
const html_sub_title = document.querySelector(".intro p");
const days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


let images = [];
let img_counter = 0;
let toggle_image = 0;

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
      if(callback)
        callback(data);
    })
    .catch(error => {
      console.error("Error:" + error);
    });
}

function start_slide_show(imgs) {
  html_imgs[0].src = `${window.location.protocol}/photo?key=${images[img_counter].cache_key}&size=xl`;
  html_imgs[0].data = images[img_counter];
  html_imgs[0].style.opacity = 1;

  html_imgs[1].src = `${window.location.protocol}/photo?key=${images[img_counter + 1].cache_key}&size=xl`;
  html_imgs[1].data = images[img_counter + 1];
  html_imgs[1].style.opacity = 0;

  setInterval(next_slide, 10000);
}

function next_slide() {
    
  console.log(html_imgs[0].style.opacity);
  console.log(html_imgs[1].style.opacity);
  console.log(toggle_image);
  
  html_title.textContent = get_title();
  html_sub_title.textContent = get_sub_title();
  set_orientation();
  
  html_imgs[0].style.opacity = toggle_image === 0 ? 0 : 1;  
  html_imgs[1].style.opacity = toggle_image === 0 ? 1 : 0;
  
  step_counter();
  html_imgs[toggle_image === 0 ? 1 : 0].src = `${window.location.protocol}/photo?key=${images[img_counter].cache_key}&size=xl`;
  html_imgs[toggle_image === 0 ? 1 : 0].data = images[img_counter];
  
  //track_image_view();

  toggle_image = toggle_image === 0 ? 1 : 0;
}

function set_orientation(){
  let which_img = toggle_image; // === 0 ? 1 : 0;
  let orientation = html_imgs[which_img].data.orientation;
  if ((orientation == 6) || (orientation == 8)){
  html_imgs[which_img].style.rotate= "90deg";
  }else{
    html_imgs[which_img].style.removeProperty("rotate");
  }
}

function get_title(){
  try {
    let title = images[img_counter].folder_name;
    title = title.split("/").pop(); //removing slash and taking last folder name. i.e. album name
    title = title.replace(" - ", " ");
    title = title.replace("-", " ");
    title = title.replace("_", " ");
    return title;

  } catch (error) {
    console.error(error);
    return "Memories"
  }
}

function get_sub_title(){
  try {
    let taken_on = new Date(images[img_counter].time * 1000);
    taken_on = `${days_of_week[taken_on.getDay()]} ${months[taken_on.getMonth()]} ${taken_on.getDate().toString().padStart(2, 0)} ${taken_on.getFullYear()}`
    return taken_on
  } catch (error) {
    console.error(error);
    return "It's all about the journey"
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
  fetch("http://127.0.0.1/api/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "id": 1009
    })
  })
    .then(response => response.json())
    .then(data => console.log("Success:", data))
    .catch(error => console.error("Error", error));
}