const {
	isMainThread, parentPort, workerData
} = require('worker_threads');
const SortedArray = require('sorted-array');

if (isMainThread)
	throw "Peer scripts should not run in the main thread"

const { id: ownID, x: ownX, y: ownY, ts: spawnTS } = workerData;
const self   = {};
const peers  = {};
let supers = new Set();
const positions = { [ownID]: { x: ownX, y: ownY } };
const stats  = {};
let currTime = 0;

console._log = console.log;
console.log = (...args) => {
	console._log(ownID, '>', ...args);
};

self.exit = () => {
	for (let peer of Object.values(peers))
		peer.close();
	parentPort.close();
	process.exit();
};

self.echo = ({ text } = {}) => {
	parentPort.postMessage(`${ownID}: ${text}`);
	return true;
};

const updateQueue = new SortedArray([], u => u.ts);

stats.forwardedUpdates = 0;
stats.forwardedBytes   = 0;
stats.agedOutUpdates   = 0;
stats.droppedUpdates   = 0;

let isWithinAOI = (a, b, radius) => {
	let dx = b.x - a.x;
	if (Math.abs(dx) > radius)
		return false;
	let dy = b.y - a.y;
	if (Math.abs(dy) > radius)
		return false;
	return Math.sqrt(dx * dx + dy * dy) <= radius;
};

let processUpdate = update => {
	let { ts, id, bytes, aoiRadius, from } = update;
	from = from || id;
	if ('x' in update) {
		let pos = positions[update.id] = positions[update.id] || {};
		pos.x = update.x;
		pos.y = update.y;
	}

	if (update.hops++ >= update.maxHops) {
		++stats.agedOutUpdates;
		return;
	}

	//drop

	// If a direct link exists, just send it there
	if (id in peers && peers[id].active) {
		peers[id].postMessage(update);
		return;
	}

	let ownPos = positions[ownID];
	for (let otherID in peers) {
		if (otherID === from
			|| otherID === id
			|| !peers[otherID].active
			// Supers can only forward to other supers
			|| (supers.has(ownID) && !supers.has(otherID))
			|| !isWithinAOI(ownPos, positions[otherID], aoiRadius))
			continue;

		peers[otherID].postMessage(update);
	}
};

self.update = update => {
	if (update.ts <= currTime)
		processUpdate(update);
	else
		updateQueue.insert(update);
};

self.time = ({ ts } = {}) => {
	currTime = ts;

	let queue = updateQueue.array;
	while (queue.length > 0 && queue[0].ts <= currTime) {
		let update = queue.shift();
		processUpdate(update);
	}
};

self.supers = ({ supers: s = [] } = {}) => {
	supers = new Set(s);
};

self.connect = ({ id, lat, active, x, y, port } = {}) => {
	if (id in peers) {
		peers[id].close();
		delete peers[id];
	}
	peers[id] = port;
	peers[id].lat = lat;
	peers[id].active = active;
	let pos = positions[id] = positions[id] || {};
	pos.x = x;
	pos.y = y;
	// TODO: This is not safe, but ok for sims
	port.on('message', msg => {
		msg.from = id;
		//console.log(`${id}${supers.has(id) ? ' (super)' : ''} sent to me an ${msg.event}`);
		if (self[msg.event](msg))
			self.exit();
	});
	port.on('close', () => {
		delete peers[id];
		delete positions[id];
	});
};

self.disconnect = ({ id } = {}) => {
	if (id in peers) {
		peers[id].close();
		delete peers[id];
	}
};

self.activate = ({ id } = {}) => {
	if (!(id in peers))
		throw `Peer ${ownID} attempted to activate a link to ${id} but that link does not exist!`;
	peers[id]['active'] = true;
};

self.deactivate = ({ id } = {}) => {
	if (id in peers)
		peers[id]['active'] = false;
};

self.broadcast = ({ msg } = {}) => {
	for (let peer of Object.values(peers))
		peer.postMessage(msg);
};

self.multicast = ({ msg } = {}) => {
	throw 'Unimplemented';
};

parentPort.on('message', msg => {
	if (self[msg.event](msg))
		self.exit();
});
