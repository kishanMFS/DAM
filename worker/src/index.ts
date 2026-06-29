

import startConsumer from "./consumer.js";

async function start() {
    console.log("Starting Worker...");

    await startConsumer();
}

start();