const e_thumbnails = document.getElementById("thumbnails");

setInterval(refresh_pic, 10000);
let auto_refreshed = "";
let toggle = 0;

{/* <article>
    <a class="thumbnail" href="images/fulls/09.jpg"><img src="images/thumbs/09.jpg" alt="" /></a>
    <h2>Morbi eget vitae adipiscing</h2>
    <p>In quis vulputate dui. Maecenas metus elit, dictum praesent lacinia lacus.</p>
</article> */}

function refresh_pic() {
    if (auto_refreshed == "PAUSE") {
        return;
    }
    e_thumbnails.innerHTML = "";
    removeScript("/assets/js/main.js");
    removeScript("/assets/js/breakpoints.min.js");

    for (i = 0; i < 12; i++) {
        const e_article = document.createElement('article');

        const e_a = document.createElement('a');
        e_a.setAttribute("id", `a-${String(i + 1).padStart(2, '0')}`);
        e_a.setAttribute("class", "thumbnail");
        e_a.setAttribute("href", `api/viewer?photo_index=${i}`);

        const e_img = document.createElement('img');
        e_img.setAttribute("id", `img-${String(i + 1).padStart(2, '0')}`);
        e_img.setAttribute("src", `api/viewer?photo_index=${i}`);
        e_a.appendChild(e_img);

        const e_h2 = document.createElement('h2');
        e_h2.setAttribute("id", `h2-${String(i + 1).padStart(2, '0')}`);
        e_h2.textContent = `title ${i + 1}`;

        const e_p = document.createElement('p');
        e_p.setAttribute("id", `p-${String(i + 1).padStart(2, '0')}`);
        e_p.textContent = `subbbbbbb title ${i + 1}`;

        e_article.appendChild(e_a);
        e_article.appendChild(e_h2);
        e_article.appendChild(e_p);

        e_thumbnails.appendChild(e_article);

    }
    addScript("assets/js/main.js");
}

/*
function refresh_pic() {
    if (auto_refreshed == "PAUSE") {
        return;
    }
    removeScript("/assets/js/main.js");
    removeScript("/assets/js/breakpoints.min.js");
    const e_a = document.getElementById("a-01");
    const e_img = document.getElementById("img-01");
    const e_p = document.getElementById("p-01");

    if (toggle == 0) {
        e_a.href = "api/viewer";
        e_img.href = "api/viewer";
        auto_refreshed = "api/viewer";
        toggle = 1;
    } else {
        e_a.href = "images/fulls/07.jpg";
        e_img.href = "images/fulls/07.jpg";
        auto_refreshed = "images/fulls/07.jpg";
        toggle = 0;
    }

    addScript("assets/js/main.js");
}
*/

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
