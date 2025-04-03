async function scan() {
    if (!g_source) {
        console.log("Source is null.");
        return;
    }

    const btnUpdate = document.getElementById("add");
    const btnScan = document.getElementById("btn_scan");
    const scanCaption = document.getElementById("scan_caption");
    const scanLoading = document.getElementById("scan_loading");
    
    btnScan.classList.add("disabled");
    scanCaption.innerText = "Starting scan...";
    scanCaption.style.visibility = "visible";

    try {
        const response = await fetch(`/api/sources/${g_source.id}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        
        const data = await response.json();
        
        if (data.message) {
            handleScanError(data.message, scanCaption, btnScan);
        } else if (data.error) {
            handleScanError(data.error, scanCaption, btnScan);
        } else {
            initiateScan(data, btnScan, btnUpdate, scanCaption, scanLoading);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

function handleScanError(message, scanCaption, btnScan) {
    let errorMessage = message.error?.code 
        ? `Saved successfully! But check your config. Eyedeea Photos could not communicate with the server. <br>${message.error.code}: ${message.error.code}`
        : message;
    
    scanCaption.innerText = `Scanning could not be started. ${errorMessage}`;
    scanCaption.style.color = "red";
    scanCaption.style.visibility = "visible";
    btnScan.classList.remove("disabled");
    setTimeout(() => {
        scanCaption.innerText = "";
        scanCaption.style.visibility = "hidden";
    }, 10000);
}

function initiateScan(data, btnScan, btnUpdate, scanCaption, scanLoading) {
    scanCaption.style.removeProperty("color");
    scanCaption.style.visibility = "visible";
    scanLoading.style.display = "flex";
    
    const tableBody = document.getElementById("dirs-table-body");
    if (tableBody) tableBody.innerHTML = "";
    
    checkScanLog(data, btnScan, btnUpdate, scanCaption);
    btnScan.classList.add("disabled");
    btnUpdate.classList.add("disabled");
    
    if (scanLogTable) scanLogTable.fetchData();
}

async function checkScanLog(data, btnScan, btnUpdate, scanCaption) {
    let timeLeft = g_source.type === "nas" ? 60 : 30;
    
    const countdownInterval = setInterval(async function () {
        if (timeLeft >= 0) {
            scanCaption.innerText = `Scanning started; scan log id: ${data.scan_log_id}. Refreshing in ${formatDuration(timeLeft)}`;
            timeLeft--;
        } else {
            clearInterval(countdownInterval);
            scanCaption.innerText = `Scanning started; scan log id: ${data.scan_log_id}. Refreshing...`;
            
            try {
                const response = await fetch(`/api/sources/${g_source.id}/scan/logs/${data.scan_log_id}`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                
                const currentScanLog = await response.json();
                
                if (currentScanLog?.updated_at) {
                    completeScanProcess(btnScan, btnUpdate, scanCaption);
                } else {
                    checkScanLog(data, btnScan, btnUpdate, scanCaption);
                }
            } catch (error) {
                console.error("Error fetching scan log:", error);
            }
        }
    }, 1000);
}

function completeScanProcess(btnScan, btnUpdate, scanCaption) {
    btnScan.classList.remove("disabled");
    btnUpdate.classList.remove("disabled");
    scanCaption.style.visibility = "hidden";
    document.getElementById("scan_loading").style.display = "none";
    scanCaption.innerText = "";
    
    show_notification("Scan successful!");
    if (scanLogTable) scanLogTable.fetchData();
    get_source_latest_scan_data();
    if (dirTable) dirTable.fetchData();
}

function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) return "Invalid input";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
        hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : "",
        minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : "",
        secs > 0 || !hours && !minutes ? `${secs} second${secs !== 1 ? 's' : ''}` : ""
    ].filter(Boolean).join(", ");
}
