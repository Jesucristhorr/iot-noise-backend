/* eslint-disable no-var */
import type { Worker } from 'worker_threads';

declare global {
    var workersBySensorId: Record<number, Worker>;
    var connectionStatusBySensorId: Record<number, 'pending' | 'connected' | 'errored'>;
    var cancelSignalBySensorId: Record<number, 'cancel' | 'retry'>;
}

export {};
