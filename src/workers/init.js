const { resolve } = require('path');
const { workerData } = require('worker_threads');

require('ts-node').register();

require(resolve(__dirname, workerData.path));
