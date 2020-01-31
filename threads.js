const {
	Worker, isMainThread, parentPort, workerData, MessageChannel
} = require('worker_threads');

if (!isMainThread)
	throw "Controller must run in main thread"

let peers = [];
let peerCount = 10;

for (let i = 0; i < peerCount; ++i) {
	const worker = new Worker('./peer.js', {
		workerData: { id: i }
	});
	worker.on('message', console.log);
	worker.on('error', console.error);
	worker.on('exit', code => {
		if (code !== 0)
			throw new Error(`Worker stopped with exit code ${code}`);
	});

	/*
	for (let j = 0, len = peers.length; j < len; ++j) {
		const other = peers[j];
		const { port1, port2 } = new MessageChannel();
		worker.postMessage({ event: 'connect', id: j, port: port1 }, [port1]);
		other.postMessage({ event: 'connect', id: i, port: port2 }, [port2]);
	}
	*/

	peers.push(worker);
}

let start = Date.now();
let update = { event: 'echo', text: 0 };
for (let peer of peers) {
	peer.postMessage(update);
	++update.text;
}
let end = Date.now();

console.log(end - start);

//peers[0].postMessage({ event: 'broadcast', msg: { event: 'echo', text: ':)' } });
//peers[0].postMessage({ event: 'broadcast', msg: { event: 'exit' } });
//peers[0].postMessage({ event: 'exit' });
