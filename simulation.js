const EventEmitter = require('events');
const assert = require('assert');
const cytoscape = require('cytoscape');
const euler     = require('cytoscape-euler');
cytoscape.use(euler);
const {
	Worker, isMainThread, parentPort, workerData, MessageChannel
} = require('worker_threads');

if (!isMainThread)
	throw "Simulator must run in main thread"

let PLNetwork = require('./network.js').PLNetwork;

let dist = (a, b) => {
	let dx = b.x - a.x;
	let dy = b.y - a.y;
	return Math.sqrt(dx * dx + dy * dy);
};

let postMessageNode = function(...args) {
	args[0].pmIndex = this.scratch('_p2p-sim').pmIndex++;
	this.scratch('_p2p-sim').worker.postMessage(...args);
};
let postMessageEdge = function(...args) {
	let source = this.source();
	let target = this.target();
	args[0].id = target.id();
	source.scratch('_p2p-sim').postMessage(...args);
	args[0].id = source.id();
	target.scratch('_p2p-sim').postMessage(...args);
};
let recomputeWeight = function() {
	let source = this.source();
	let target = this.target();
	let distance = dist(source.position(), target.position());
	this.data('dist', distance);
	this.data('weight', 0.8 * this.data('lat') + 0.2 * distance);
};

class Simulation extends EventEmitter {
	constructor({
		lossRatio    = 0.0,
		chanceOfEvil = 0.0,
		aoiRadius    = 390,
		maxHops      = 3,
		topology,
		topoRecomputeInterval,
		dryRun       = false
	} = {}) {
		super();
		this.nextMsgID = 0;
		this.chanceOfEvil          = chanceOfEvil;
		this.lossRatio             = lossRatio;
		this.aoiRadius             = aoiRadius;
		this.aoiRadiusWithBuffer   = 2 * aoiRadius; // Assumes symmetric AOIs
		this.maxHops               = maxHops;
		this.topology              = topology;
		this.topoRecomputeInterval = topoRecomputeInterval;
		this.nextTopoRecomputeTS   = 0;
		this.dryRun                = dryRun;
		//this.metricWeights = [];
		let network = this.network = new PLNetwork();
		this.world = cytoscape()
			.on('add', event => {
				let elem = event.target;
				if (elem.group() === 'nodes') {
					elem.scratch('_p2p-sim', {});
					elem.scratch('_p2p-sim').postMessage = postMessageNode.bind(elem);
				} else if (elem.group() === 'edges') {
					elem.scratch('_p2p-sim', {});
					elem.scratch('_p2p-sim').postMessage = postMessageEdge.bind(elem);
					elem.scratch('_p2p-sim').recomputeWeight = recomputeWeight.bind(elem);
					elem.scratch('_p2p-sim').recomputeWeight();
				}
			})
			//.on('remove', console.log)
			.on('position', event => {
				let elem = event.target;
				if (elem.group() === 'nodes')
					elem.connectedEdges().data('dirty', true);
			});
		this.world.scratch('_p2p-sim', {});
		this.world.scratch('_p2p-sim').actualPeerCount = new Uint32Array(new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT));
	}

	async init() {
		await this.network.init();
	}

	exitPromises = [];
	stats = [];

	async end() {
		if (this.dryRun)
			return;
		this.world.nodes().forEach(n => n.scratch('_p2p-sim').postMessage({ event: 'exit' }));
		await Promise.all(this.exitPromises);
	}

	getPeer(id) {
		return this.world.$id(id);
	}

	spawn(player) {
		player.ip  = this.network.getIP();
		let isEvil = Math.random() < this.chanceOfEvil;
		let netPos = this.network.cy.nodes(`[id = "${player.ip}"]`).position();
		let peer = this.world.add({
			data: {
				id: player.id,
				shortID: player.id,//.slice(-2),
				ip: player.ip,
				netPos: {
					//x: isEvil? (netPos.x * 1000000) : netPos.x,
					//y: isEvil? (netPos.y * 1000000) : netPos.y
					x: netPos.x,
					y: netPos.y
				},
				evil: isEvil,
				lastUpdate: player.ts
			},
			position: {
				x: player.x || 0,
				y: player.y || 0,
			}
		});
		let gtPos  = new Float32Array(new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 2));
		gtPos[0]   = player.x || 0;
		gtPos[1]   = player.x || 0;
		peer.scratch('_p2p-sim').gtPos = gtPos;
		peer.scratch('_p2p-sim').pmIndex = 0;
		let actualPeerCount = this.world.scratch('_p2p-sim').actualPeerCount;
		++actualPeerCount[0];
		if (!this.dryRun) {
			// TODO: Move this to add event listener
			const worker = new Worker('./peer.js', {
				workerData: { ...player, isEvil, lossRatio: this.lossRatio, topology: this.topology.constructor.name, gtPos, actualPeerCount }
			});
			//console.log('spawned', player);
			worker.on('message', m => {
				this.stats.push(m)
				//worker.terminate();
			});
			worker.on('error', console.error);
			this.exitPromises.push(new Promise(resolve => worker.on('exit', resolve)));
			//peer.scratch('worker', worker);
			//peer.scratch('wideAOI', new Set());
			peer.scratch('_p2p-sim').worker = worker;
			peer.scratch('_p2p-sim').postMessage({ event: 'supers', supers: this.latestSupers });
			peer.scratch('_p2p-sim').postMessage({ event: 'peers', peers: this.world.nodes(`[ id != "${player.id}" ]`).map(n => ({ id: n.id(), gtPos: n.scratch('_p2p-sim').gtPos })) });
		}
		this.world.nodes(`[ id != "${player.id}"]`).forEach(other => {
			if (!this.dryRun)
				other.scratch('_p2p-sim').postMessage({ event: 'peer', id: player.id, gtPos })
			this.world.add({
				data: {
					id: player.id + '-' + other.id(),
					source: player.id,
					target: other.id(),
					active: false,
					connected: false,
					weight: -1,
					lat: this.network.dist(player.ip, other.data().ip) * (isEvil ? 2 : 1),
					//lat: this.network.$id(player.ip).edgesWith(`[ id = "${other.data().ip}" ]`).data('meanLat'),
					dist: -1,
					trust: -1,
					redundant: false
				}
			});
		});

		return peer;
	}

	updatePos(peer, x, y, ts) {
		peer.position({ x, y });
		peer.scratch('_p2p-sim').gtPos[0] = x;
		peer.scratch('_p2p-sim').gtPos[1] = y;
		peer.data('lastUpdate', ts);
	}

	aoicast(peer, ts, id, bytes, aoiRadius, x, y) {
		let update = {
			event: 'update',
			ts,
			id,
			bytes,
			aoiRadius,
			hops: 0,
			maxHops: this.maxHops,
			msgID: this.nextMsgID++,
			corruptionCount: 0,
			latency: 0
		};
		if (x && y) {
			update.x = x;
			update.y = y;
		}

		if (!this.dryRun)
			peer.scratch('_p2p-sim').postMessage(update);
	}

	despawn(peer) {
		this.network.releaseIP(peer.data('ip'));
		this.world.remove(peer);
		if (!this.dryRun)
			peer.scratch('_p2p-sim').postMessage({ event: 'exit' });
	}

	despawnZombies(ts) {
		for (let peer of this.world.nodes().toArray())
			if (peer.data('lastUpdate') + 3600000 < ts) // One hour since last update
				this.despawn(peer);
	}

	inWideAOI(peerPos, otherPos) {
		let dx = otherPos.x - peerPos.x;
		if (Math.abs(dx) > this.aoiRadiusWithBuffer)
			return false;
		let dy = otherPos.y - peerPos.y;
		if (Math.abs(dy) > this.aoiRadiusWithBuffer)
			return false;
		return dist(peerPos, otherPos) <= this.aoiRadiusWithBuffer;
	}

	connectEdge(edge) {
		const { port1, port2 } = new MessageChannel();
		const lat = edge.data('lat');
		const active = edge.data('active');
		let source = edge.source();
		let target = edge.target();
		let sourcePos = source.position();
		let targetPos = target.position();
		let sourceGTPos = source.scratch('_p2p-sim').gtPos;
		let targetGTPos = source.scratch('_p2p-sim').gtPos;
		if (!this.dryRun) {
			source.scratch('_p2p-sim').postMessage({ event: 'connect', id: target.id(), lat, active, x: targetPos.x, y: targetPos.y, gtPos: targetGTPos, port: port1 }, [port1]);
			target.scratch('_p2p-sim').postMessage({ event: 'connect', id: source.id(), lat, active, x: sourcePos.x, y: sourcePos.y, gtPos: sourceGTPos, port: port2 }, [port2]);
		}
	}

	disconnectEdge(edge) {
		if (this.dryRun)
			return;
		edge.scratch('_p2p-sim').postMessage({ event: 'disconnect' });
	}

	connectPeers(peer, other) {
		this.connectEdge(peer.edgesWith(other));
	}

	disconnectPeers(peer, other) {
		this.disconnectEdge(peer.edgesWith(other));
	}

	activateEdge(edge) {
		if (this.dryRun)
			return;
		edge.scratch('_p2p-sim').postMessage({ event: 'activate' });
	}

	deactivateEdge(edge) {
		if (this.dryRun)
			return;
		edge.scratch('_p2p-sim').postMessage({ event: 'deactivate' });
	}

	broadcastTimestamp(ts) {
		if (this.dryRun)
			return;
		for (let peer of this.world.nodes().toArray())
			peer.scratch('_p2p-sim').postMessage({ event: 'time', ts });
	}

	broadcastSupers(supers = []) {
		this.latestSupers = supers;
		if (this.dryRun)
			return;
		for (let peer of this.world.nodes().toArray())
			peer.scratch('_p2p-sim').postMessage({ event: 'supers', supers });
	}

	rewire() {
		assert(this.world.edges('[?active][!connected]').length < 1)

		let currConnections = this.world.edges('[?connected]');
		let prevConnections = this.world.edges('[?prevConnected]');
		let d = prevConnections.diff(currConnections);
		let deltaConnections    = d.right;
		let deltaDisconnections = d.left;

		assert(deltaConnections.intersection(deltaDisconnections).length < 1);

		deltaConnections.forEach(edge => this.connectEdge(edge));
		deltaDisconnections.forEach(edge => this.disconnectEdge(edge));


		let currActivations = this.world.edges('[?active]');
		let prevActivations = this.world.edges('[?prevActive]');
		d = prevActivations.diff(currActivations);
		let deltaActivations   = d.right;
		let deltaDeactivations = d.left;

		assert(deltaActivations.intersection(deltaDeactivations).length < 1);

		deltaActivations.forEach(edge => this.activateEdge(edge));
		deltaDeactivations.forEach(edge => this.deactivateEdge(edge));

		if (this.world.data('supersChanged'))
			this.broadcastSupers(this.world.nodes('[?super]').map(n => n.id()));
	}

	recomputeTopology(ts) {
		this.world.edges('[?dirty]').forEach(e => e.scratch('_p2p-sim').recomputeWeight());
		this.topology.recompute(this.world, this);
		this.topology.preconnect(this.world, this);
		this.rewire();
		this.nextTopoRecomputeTS = ts + this.topoRecomputeInterval;

		let maxDegree       = 0;
		let maxActiveDegree = 0;
		this.world.nodes().forEach(n => {
			maxDegree       = Math.max(maxDegree,       n.neighborhood('edge[?connected]').length);
			maxActiveDegree = Math.max(maxActiveDegree, n.neighborhood('edge[?active]').length);
		});

		let peerCount = this.world.nodes().length;
		this.emit('maxDegree', peerCount, maxDegree);
		this.emit('maxActiveDegree', peerCount, maxActiveDegree);
	}

	/*
	rewire() {
		const peers = this.world.nodes().toArray();

		for (let i = 0; i < peers.length; ++i) {
			let peer = peers[i];
			let peerID = peer.id();
			let peerPos = peer.position();
			let prevWideAOI = peer.scratch('wideAOI');
			let currWideAOI = new Set();
			for (let j = i + 1; j < peers.length; ++j) {
				let other = peers[j];
				if (this.inWideAOI(peerPos, other.position()))
					currWideAOI.add(other);
			}
			peer.scratch('wideAOI', currWideAOI);

			let toDisconnect = [...prevWideAOI].filter(p => !currWideAOI.has(p));
			for (const other of toDisconnect)
				this.disconnectPeers(peer, other);

			let toConnect    = [...currWideAOI].filter(p => !prevWideAOI.has(p));
			for (const other of toConnect)
				this.connectPeers(peer, other);
		}
	}
	*/
}

module.exports = Simulation;
