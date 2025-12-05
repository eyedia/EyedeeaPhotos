import { parentPort, workerData } from 'worker_threads';
import { internal_scan } from './syno_scanner.mjs';

(async () => {
    try {
        const { scan_started_data, folder_id } = workerData;        
        await internal_scan(scan_started_data, folder_id);

        parentPort.postMessage({ type: 'completed', message: "Scanning completed successfully" });
    } catch (error) {
        parentPort.postMessage({ type: 'error', error: error.message });
    }
})();
