/* eslint-disable no-var */
import type { Worker } from 'worker_threads';

declare global {
    var workersBySensorId: Record<number, Worker>;
    var connectionStatusBySensorId: Record<
        number,
        'pending' | 'connected' | 'errored' | 'parse-issue'
    >;
    var connectionErrorMsgsBySensorId: Record<number, string>;
    var cancelSignalBySensorId: Record<number, 'cancel' | 'retry'>;
}

export {};
