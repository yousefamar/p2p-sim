const {
	isMainThread, parentPort, workerData
} = require('worker_threads');
const assert = require('assert');
const SortedArray = require('sorted-array');

if (isMainThread)
	throw "Peer scripts should not run in the main thread"

const { id: ownID, x: ownX, y: ownY, ts: spawnTS, isEvil, lossRatio, topology, gtPos: ownGTPos, actualPeerCount } = workerData;

const prng = require('seedrandom')(ownID + ' ' + spawnTS);

const canCastOutsideOfAOI = [ 'Chord', 'Ours' ].includes(topology); // Supers don't count
const cantForward = [ 'Complete', 'AOI' ].includes(topology);

//'ClientServer'
//'Complete'
//'AOI'
//'Delaunay'
//'Kiwano'
//'Chord'
//'Superpeers'
//'Ours'

const self   = {};
const peers  = { [ownID]: { id: ownID, pos: { x: ownX, y: ownY }, lastPosUpdate: spawnTS } };
let supers = new Set();
let currTime = spawnTS;
let lastOwnAOIRadius = 0;
// TODO: Un-harcode
const driftSampleInterval = 1000;
let nextDriftSampleTS = spawnTS + driftSampleInterval;

const stats = {
	updates: {
		emitted: {
			total: 0,
			position: 0
		},
		received: {
			total: 0,
			bytes: 0,
			position: 0,
			nonPosition: 0,
		},
		ignored: {
			total: 0,
			corrupt: 0
		},
		accepted: {
			total: 0,
			corrupt: 0,
			corruptMag: 0,
			irrelevant: 0
		},
		dropped: {
			total: 0,
			dueToAge: 0,
			dueToLoss: 0,
			dueToCooldown: 0,
			dueToDespawn: 0,
			dueToUnknownRoot: 0 // not per-update
		},
		forwarded: {
			total: 0
		},
		cast: {
			total: 0
		},
		sent: {
			total: 0,
			bytes: 0
		},
		uploaded: {
			total: 0,
			bytes: []
		},
		downloaded: {
			total: 0,
			bytes: []
		}
	},
	meanDrift: {
		sum: [],
		samples: []
	},
	consistency: {
		sumMissingRatio: 0,
		sumExtraRatio: 0,
		samples: 0
	},
	timeAliveMS: 0,
	logCount: 0,
	activationQueueSize: 0
};

console._log = console.log;
console.log = function(...args) {
	console._log(ownID, '>', ...args);
	++stats.logCount;
};

let isWithinAOI = (a, b, radius) => {
	let dx = b.x - a.x;
	if (Math.abs(dx) > radius)
		return false;
	let dy = b.y - a.y;
	if (Math.abs(dy) > radius)
		return false;
	return Math.sqrt(dx * dx + dy * dy) <= radius;
};

let driftDist = (peerPos, peerPosGT) => {
	let dx = peerPosGT[0] - peerPos.x;
	let dy = peerPosGT[1] - peerPos.y;
	return Math.sqrt(dx * dx + dy * dy);
};

let canSend = (rootID, sourceID, destID, aoiRadius) => {
	if ( destID === ownID           // Don't send to self
		|| destID === sourceID        // Don't send back where it came
		|| destID === rootID          // Don't send back to originator
		|| !('port' in peers[destID]) // Don't send to unconnected peers
		|| !peers[destID].active)     // Don't send down inactive link
		return false;

	if (supers.has(destID)) // Allow all traffic to supers
		return true;

	// Don't send if dest outside root's AOI and that is unsupported by topology
	// If root's position is unknown, also don't send
	if(!canCastOutsideOfAOI) {
		if (!('pos' in peers[rootID])) {
			++stats.updates.dropped.dueToUnknownRoot;
			return false;
		}
		if(!isWithinAOI(peers[rootID].pos, peers[destID].pos, aoiRadius))
			return false;
	}

	return true;
};

let sum = a => a.length ? a.reduce((acc, curr) => acc + curr) : 0;

let zeroArrayUndefineds = a => {
	for (let i = 0, len = a.length; i < len; ++i)
		a[i] = a[i] || 0;
};

self.exit = () => {
	for (let peer of Object.values(peers))
		if ('port' in peer)
			peer.port.close();

	stats.updates.dropped.total += updateQueue.array.length;
	stats.updates.dropped.dueToDespawn += updateQueue.array.length;
	stats.timeAliveMS = currTime - spawnTS;
	stats.activationQueueSize = activationQueue.size;

	zeroArrayUndefineds(stats.meanDrift.sum);
	zeroArrayUndefineds(stats.meanDrift.samples);

	let sumDrift         = sum(stats.meanDrift.sum);
	let sumSamples       = sum(stats.meanDrift.samples);
	assert(stats.meanDrift.sum.length === stats.meanDrift.samples.length);
	stats.meanMeanDrift  = sumSamples ? sumDrift / sumSamples : 0

	stats.meanMeanDrifts  = [];
	for (let i = 0, len = stats.meanDrift.sum.length; i < len; ++i)
		stats.meanMeanDrifts[i] = stats.meanDrift.samples[i] ? stats.meanDrift.sum[i] / stats.meanDrift.samples[i] : 0;

	zeroArrayUndefineds(stats.updates.uploaded.bytes);
	zeroArrayUndefineds(stats.updates.downloaded.bytes);

	let sumUploadBytes   = sum(stats.updates.uploaded.bytes);
	let sumDownloadBytes = sum(stats.updates.downloaded.bytes);

	stats.meanUpload   = stats.timeAliveMS ? sumUploadBytes   / stats.timeAliveMS : 0;
	stats.meanDownload = stats.timeAliveMS ? sumDownloadBytes / stats.timeAliveMS : 0;

	// FIXME: Hardcoded
	let timePerSegment = 2 * 60 * 1000;

	stats.meanUploads   = [];
	for (let i = 0, len = stats.updates.uploaded.bytes.length; i < len; ++i)
		stats.meanUploads[i] = stats.updates.uploaded.bytes[i] / timePerSegment;

	stats.meanDownloads = [];
	for (let i = 0, len = stats.updates.downloaded.bytes.length; i < len; ++i)
		stats.meanDownloads[i] = stats.updates.downloaded.bytes[i] / timePerSegment;

	stats.meanMissingRatio = stats.consistency.samples ? stats.consistency.sumMissingRatio / stats.consistency.samples : 0;
	stats.meanExtraRatio   = stats.consistency.samples ? stats.consistency.sumExtraRatio   / stats.consistency.samples : 0;

	stats.updates.attemptedToSend = stats.updates.sent.total + stats.updates.dropped.dueToCooldown + stats.updates.dropped.dueToLoss;

	parentPort.postMessage(stats);
	parentPort.close();
	process.exit();
};

self.echo = ({ text } = {}) => {
	parentPort.postMessage(`${ownID}: ${text}`);
	//return true;
};

const updateQueue = new SortedArray([], u => u.ts + u.latency);

let processUpdate = update => {
	let { ts, latency, id: rootID, bytes, aoiRadius, sourceID, corruptionCount } = update;

	if (rootID === ownID) { // Emitted
		assert(sourceID == null);
		++stats.updates.emitted.total;
		sourceID = ownID;
		lastOwnAOIRadius = aoiRadius;
		if ('x' in update) {
			++stats.updates.emitted.position;
			peers[ownID].pos.x = update.x;
			peers[ownID].pos.y = update.y;
		}
		update.gtPos = ownGTPos;
	} else { // Received
		++stats.updates.received.total;
		stats.updates.received.bytes += bytes;
		++stats.updates.downloaded.total;
		stats.updates.downloaded.bytes[actualPeerCount[0]] = stats.updates.downloaded.bytes[actualPeerCount[0]] || 0;
		stats.updates.downloaded.bytes[actualPeerCount[0]] += bytes;

		let peer = peers[rootID] = peers[rootID] || {};
		peer.gtPos = update.gtPos;

		if ('x' in update) { // Position update
			++stats.updates.received.position;

			if (rootID in peers && peers[rootID].lastPosUpdate <= ts + latency) { // Outdated update
				++stats.updates.ignored.total;
				if (corruptionCount > 0)
					++stats.updates.ignored.corrupt;
				return; // Ignore
			}

			if (!('pos' in peer))
				peer.pos = { x: update.x, y: update.y };

			let oldPos = peer.pos;
			let newPos = update;
			if (!isWithinAOI(peers[ownID].pos, oldPos) && !isWithinAOI(peers[ownID], newPos)) // External movement
				++stats.updates.accepted.irrelevant;

			peer.pos.x = update.x;
			peer.pos.y = update.y;
			peer.lastPosUpdate = ts + latency;
		} else { // Any other update
			++stats.updates.received.nonPosition;
		}

		++stats.updates.accepted.total;
		if (corruptionCount > 0) {
			++stats.updates.accepted.corrupt;
			stats.updates.accepted.corruptMag += corruptionCount;
		}

		if (cantForward)
			return; // Drop

		if (update.hops++ >= update.maxHops) {
			++stats.updates.dropped.total;
			++stats.updates.dropped.dueToAge;
			return; // Drop
		}

		++stats.updates.forwarded.total;
	}

	++stats.updates.cast.total;

	if (isEvil && !(topology === 'ClientServer' && supers.has(ownID)))
		++update.corruptionCount;

	for (let destID in peers) {
		if (!canSend(rootID, sourceID, destID, aoiRadius))
			continue;

		if ((ts + latency) < peers[destID].cooldownTS) {
			++stats.updates.dropped.dueToCooldown;
			continue; // Drop
		}

		++stats.updates.uploaded.total;
		stats.updates.uploaded.bytes[actualPeerCount[0]] = stats.updates.uploaded.bytes[actualPeerCount[0]] || 0;
		stats.updates.uploaded.bytes[actualPeerCount[0]] += bytes;

		if (prng() < lossRatio) {
			++stats.updates.dropped.dueToLoss;
			continue; // Drop
		}

		update.sourceID = ownID;
		update.latency  = latency + (topology === 'ClientServer' && supers.has(ownID)) ? peers[destID].lat / 2 : peers[destID].lat;
		peers[destID].port.postMessage(update);

		++stats.updates.sent.total;
		stats.updates.sent.bytes += bytes;
	}
};

self.update = update => {
	if ((update.ts + update.latency) <= currTime)
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

	while (nextDriftSampleTS <= currTime) {
		let ownPos = peers[ownID].pos;
		let peerCount = actualPeerCount[0];
		let unknownPeerCount = peerCount - Object.keys(peers).length;

		let aoiGT = Object.values(peers).filter(p => {
			if (p.id === ownID)
				return false;
			let gtPos = { x: p.gtPos[0], y: p.gtPos[1] };
			return isWithinAOI(ownPos, gtPos, lastOwnAOIRadius);
		});
		let aoiGTSet = new Set(aoiGT);

		let aoi = Object.values(peers).filter(p => 'pos' in p);
		let aoiSet = new Set(aoi);

		let missingPeers = aoiGT.filter(p => !aoiSet.has(p));
		let extraPeers   = aoi.filter(p => !aoiGTSet.has(p));

		stats.consistency.sumMissingRatio += (aoiGT.length + unknownPeerCount) ? (missingPeers.length + unknownPeerCount) / (aoiGT.length + unknownPeerCount) : 1;
		stats.consistency.sumExtraRatio   += aoi.length ? extraPeers.length / aoi.length : 0;
		++stats.consistency.samples;

		let correctPeers = aoiGT.filter(p => aoiSet.has(p));

		let drifts = correctPeers.map(p => driftDist(p.pos, p.gtPos));

		stats.meanDrift.sum[peerCount] = stats.meanDrift.sum[peerCount] || 0;
		stats.meanDrift.sum[peerCount] += drifts.length ? drifts.reduce((acc, curr) => acc + curr) / drifts.length : 0;
		stats.meanDrift.samples[peerCount] = stats.meanDrift.samples[peerCount] || 0;
		++stats.meanDrift.samples[peerCount];

		nextDriftSampleTS += driftSampleInterval;
	}
};

self.supers = ({ supers: s = [] } = {}) => {
	supers = new Set(s);
};

self.connect = ({ id, lat, active, x, y, gtPos, port } = {}) => {
	if (id in peers) {
		if (port in peers[id])
			peers[id].port.close();
		delete peers[id];
	}
	peers[id] = {
		id,
		port,
		lat,
		active,
		pos: { x, y },
		gtPos,
		lastPosUpdate: currTime,
		cooldownTS: currTime + Math.max(4000, 12.5 * lat + 2750)
	};
	// TODO: This is not safe, but ok for sims
	port.on('message', msg => {
		msg.from = id;
		//console.log(`${id}${supers.has(id) ? ' (super)' : ''} sent to me an ${msg.event}`);
		eventQueue.push(msg);
	});
	port.on('close', () => {
		delete peers[id];
	});
	//if ((ownID === '5da90f638e6f307fd4cdfd39' && id === '5dc760c338a19a33168ceced')
	//	|| (id === '5da90f638e6f307fd4cdfd39' && ownID === '5dc760c338a19a33168ceced'))
	//	console.log(id, 'connected!', activationQueue);
	if (activationQueue.size && activationQueue.has(id)) {
		peers[id].active = true;
		activationQueue.delete(id);
	}
};

self.peer = ({ id, gtPos }) => {
	let peer   = peers[id] = peers[id] || {};
	peer.id    = id;
	peer.gtPos = gtPos;
}

self.peers = ({ peers }) => {
	for (let peer of peers)
		self.peer(peer);
};

self.disconnect = ({ id } = {}) => {
	//if ((ownID === '5da90f638e6f307fd4cdfd39' && id === '5dc760c338a19a33168ceced')
	//	|| (id === '5da90f638e6f307fd4cdfd39' && ownID === '5dc760c338a19a33168ceced'))
	//	console.log(id, 'disconnected!', activationQueue);
	if (id in peers) {
		if ('port' in peers[id])
			peers[id].port.close();
		delete peers[id];
	}
};

let activationQueue = new Set();

self.activate = ({ id } = {}) => {
	if (!(id in peers)) {
		//console.log(`Peer ${ownID} attempted to activate a link to ${id} but that link does not exist!`, currTime - spawnTS);
		//throw `Peer ${ownID} attempted to activate a link to ${id} but that link does not exist!`;
		activationQueue.add(id);
		return;
	}
	peers[id].active = true;
};

self.deactivate = ({ id } = {}) => {
	if (id in peers)
		peers[id].active = false;
};

self.broadcast = ({ msg } = {}) => {
	for (let peer of Object.values(peers))
		peer.port.postMessage(msg);
};

self.multicast = ({ msg } = {}) => {
	throw 'Unimplemented';
};

let eventQueue = [];
let lastPMIndex = -1;
parentPort.on('message', msg => {
	assert(msg.pmIndex === lastPMIndex + 1);
	lastPMIndex = msg.pmIndex;
	eventQueue.push(msg);
});

let processQueue = () => {
	while (eventQueue.length > 0) {
		let event = eventQueue.shift();
		if (self[event.event](event))
			self.exit();
	}
	setTimeout(processQueue, 0);
};
processQueue();
