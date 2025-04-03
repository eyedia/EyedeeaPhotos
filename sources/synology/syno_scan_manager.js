import { Worker } from 'worker_threads';

export function startInternalScanInWorker(scan_started_data, folder_id) {    
    return new Promise((resolve, reject) => {
        const worker = new Worker('./sources/synology/syno_scan_worker.js', {
            workerData: { scan_started_data, folder_id }
        });

        worker.on('message', (msg) => {
            if (msg.type === 'completed') {
                console.log(msg.message);
                resolve(msg.message);
            } else if (msg.type === 'error') {
                reject(new Error(msg.error));
            }
        });

        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

// Example Usage
// startInternalScanInWorker({ source_id: 123 }, -1)
//     .then(console.log)
//     .catch(console.error);
