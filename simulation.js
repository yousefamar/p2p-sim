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

class Simulation {
	constructor({ chanceOfEvil = 0.0, aoiRadius = 390, maxHops = 3 } = {}) {
		this.nextMsgID = 0;
		this.chanceOfEvil        = chanceOfEvil;
		this.aoiRadius           = aoiRadius;
		this.aoiRadiusWithBuffer = 2 * aoiRadius; // Assumes symmetric AOIs
		this.maxHops             = maxHops;
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
					elem.connectedEdges().forEach(e => e.scratch('_p2p-sim').recomputeWeight());
			});
	}

	async init() {
		await this.network.init();
	}

	end() {
		this.world.nodes().forEach(n => n.scratch('worker').postMessage({ event: 'exit' }));
	}

	getPeer(id) {
		return this.world.$id(id);
	}

	spawn(player) {
		player.ip = this.network.getIP();
		let isEvil = Math.random() < this.chanceOfEvil;
		let netPos = this.network.cy.nodes(`[id = "${player.ip}"]`).position();
		let peer = this.world.add({
			data: {
				id: player.id,
				shortID: player.id,//.slice(-2),
				ip: player.ip,
				netPos: {
					x: isEvil? (netPos.x * 1000000) : netPos.x,
					y: isEvil? (netPos.y * 1000000) : netPos.y
				},
				evil: isEvil
			},
			position: {
				x: player.x || 0,
				y: player.y || 0,
			}
		});
		// TODO: Move this to add event listener
		const worker = new Worker('./peer.js', {
			workerData: { ...player, router: this.router }
		});
		worker.on('message', console.log);
		worker.on('error', console.error);
		//peer.scratch('worker', worker);
		//peer.scratch('wideAOI', new Set());
		peer.scratch('_p2p-sim').worker = worker;
		peer.scratch('_p2p-sim').postMessage({ event: 'supers', supers: this.latestSupers });
		this.world.nodes(`[ id != "${player.id}"]`).forEach(other => {
			this.world.add({
				data: {
					id: player.id + '-' + other.id(),
					source: player.id,
					target: other.id(),
					active: false,
					connected: false,
					weight: -1,
					lat: this.network.dist(player.ip, other.data().ip) + (isEvil ? 1000000000 : 0),
					//lat: this.network.$id(player.ip).edgesWith(`[ id = "${other.data().ip}" ]`).data('meanLat'),
					dist: -1,
					trust: -1,
					redundant: false
				}
			});
		});

		return peer;
	}

	updatePos(peer, x, y) {
		peer.position({ x, y });
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
			msgID: this.nextMsgID++
		};
		if (x && y) {
			update.x = x;
			update.y = y;
		}

		peer.scratch('_p2p-sim').postMessage(update);
	}

	despawn(peer) {
		this.network.releaseIP(peer.data('ip'));
		this.world.remove(peer);
		peer.scratch('_p2p-sim').postMessage({ event: 'exit' });
	}

	inWideAOI(peerPos, otherPos) {
		let dx = otherPos.x - peerPos.x;
		if (Math.abs(dx) > this.aoiRadiusWithBuffer)
			return false;
		let dy = otherPos.y - peerPos.y;
		if (Math.abs(dy) > this.aoiRadiusWithBuffer)
			return false;
		if (dist(peerPos, otherPos) > this.aoiRadiusWithBuffer)
			return false;
		return true;
	}

	connectEdge(edge) {
		const { port1, port2 } = new MessageChannel();
		const lat = edge.data('lat');
		const active = edge.data('active');
		let source = edge.source();
		let target = edge.target();
		let sourcePos = source.position();
		let targetPos = target.position();
		source.scratch('_p2p-sim').postMessage({ event: 'connect', id: target.id(), lat, active, x: targetPos.x, y: targetPos.y, port: port1 }, [port1]);
		target.scratch('_p2p-sim').postMessage({ event: 'connect', id: source.id(), lat, active, x: targetPos.x, y: targetPos.y, port: port2 }, [port2]);
	}

	disconnectEdge(edge) {
		edge.scratch('_p2p-sim').postMessage({ event: 'disconnect' });
	}

	connectPeers(peer, other) {
		this.connectEdge(peer.edgesWith(other));
	}

	disconnectPeers(peer, other) {
		this.disconnectEdge(peer.edgesWith(other));
	}

	activateEdge(edge) {
		edge.scratch('_p2p-sim').postMessage({ event: 'activate' });
	}

	deactivateEdge(edge) {
		edge.scratch('_p2p-sim').postMessage({ event: 'deactivate' });
	}

	broadcastTimestamp(ts) {
		for (let peer of this.world.nodes().toArray())
			peer.scratch('_p2p-sim').postMessage({ event: 'time', ts });
	}

	broadcastSupers(supers = []) {
		this.latestSupers = supers;
		for (let peer of this.world.nodes().toArray())
			peer.scratch('_p2p-sim').postMessage({ event: 'supers', supers });
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
