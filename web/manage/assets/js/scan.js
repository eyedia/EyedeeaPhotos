async function scan() {
    if (!g_source) {
        console.log("Source is null.");
        return;
    }

    const btn_update = document.getElementById("add");
    const btn_scan = document.getElementById('btn_scan');
    const scan_caption = document.getElementById('scan_caption');
    const scan_loading = document.getElementById("scan_loading");

    try {
        const response = await fetch(`/api/sources/${g_source.id}/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.message) {
            error_message = ""
            if (data.message && data.message.error && data.message.error.code) {
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
            scan_loading.style.display = "flex"; 
            const tableBody = document.getElementById("dirs-table-body");
            if (tableBody)
                tableBody.innerHTML = '';
            checkScanLog(data, btn_scan, btn_update, scan_caption);
            btn_scan.classList.add("disabled");
            btn_update.classList.add("disabled");
            if(scanLogTable) scanLogTable.fetchData();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function checkScanLog(data, btn_scan, btn_update, scan_caption) {
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
                    btn_update.classList.remove("disabled");
                    scan_caption.style.visibility = 'hidden';
                    scan_loading.style.display = "none"; 
                    scan_caption.innerText = "";
                    show_notification("Scan successful!");
                    if(scanLogTable) scanLogTable.fetchData()
                    get_source_latest_scan_data();
                    if(dirTable) dirTable.fetchData();
                } else {
                    checkScanLog(data, btn_scan, btn_update, scan_caption);
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
