const { parentPort, workerData } = require("node:worker_threads");
require("./scanner.cjs").scan(workerData.root, { ...workerData.options, progress: (p) => parentPort.postMessage({ type: "progress", data: p }) }).then((data) => parentPort.postMessage({ type: "done", data })).catch((e) => parentPort.postMessage({ type: "error", message: e.message }));
