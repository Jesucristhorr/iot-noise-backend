/* eslint-disable no-var */
import type { Worker } from 'worker_threads';

declare global {
    var workersBySensorId: Record<number, Worker>;
}
