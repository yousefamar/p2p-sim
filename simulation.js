const cytoscape = require('cytoscape');
const euler     = require('cytoscape-euler');
cytoscape.use(euler);

let PLNetwork = require('./network.js').PLNetwork;

let dist = (a, b) => {
	let dx = b.x - a.x;
	let dy = b.y - a.y;
	return Math.sqrt(dx * dx + dy * dy);
};

class Simulation {
	constructor() {
		this.minK = 2;
		//this.metricWeights = [];
		let network = this.network = new PLNetwork();
		let recomputeWeight = function() {
			let source = this.source();
			let target = this.target();
			let distance = dist(source.position(), target.position());
			this.data('dist', distance);
			this.data('weight', 0.8 * this.data('lat') + 0.2 * distance);
		};
		this.world = cytoscape()
			.on('add', event => {
				let elem = event.target;
				if (elem.group() === 'edges') {
					elem.scratch('_p2p-sim', {});
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

	getPeer(id) {
		return this.world.$id(id);
	}

	spawn(player) {
		player.ip = this.network.getIP();
		let peer = this.world.add({
			data: {
				id: player.id,
				shortID: player.id.slice(-2),
				ip: player.ip
			},
			position: {
				x: player.x || 0,
				y: player.y || 0,
			}
		});
		this.world.nodes(`[ id != "${player.id}"]`).forEach(other => {
			this.world.add({
				data: {
					id: player.id + '-' + other.id(),
					source: player.id,
					target: other.id(),
					active: false,
					weight: -1,
					lat: this.network.dist(player.ip, other.data().ip),
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

	despawn(peer) {
		this.network.releaseIP(peer.data('ip'));
		this.world.remove(peer);
	}

	aoicast(fw, ts, from, bytes, aoiRadius) {
		let tos = this.world.nodes(`[ id != "${from.id()}"]`).filter(to => dist(to.position(), from.position()) <= aoiRadius);
		return this.multicast(fw, ts, from, tos, bytes);
	}

	broadcast(fw, ts, from, bytes) {
		let tos = this.world.nodes(`[ id != "${from.id()}"]`);
		return this.multicast(fw, ts, from, tos, bytes);
	}

	multicast(fw, ts, from, tos, bytes) {
		let out = {
			lats: [],
			infos: []
		};

		// No receivers -> no traffic
		if (tos.length < 1)
			return out;

		let paths = this.world.collection();
		tos.forEach(to => {
			let path = fw.path(from, to);
			let lat  = fw.distance(from, to);
			out.lats.push(lat);
			if (path.edges().length < 1)
				throw 'Something went horribly, terribly wrong; network disconnected';
			paths = paths.union(path);
		});

		// This would be so much simpler recursive
		this.world.nodes().data('visited', true);
		paths.nodes().data('visited', false);
		let queue = [
			{ ts: +ts, lat: 0, to: from }
		];

		while (queue.length > 0) {
			let arrival = queue.shift();
			arrival.to.data('visited', true);

			let nextNodes = arrival.to.openNeighborhood('[!visited]').nodes();

			nextNodes.forEach(n => {
				let lat = +arrival.to.edgesWith(n).data('lat');
				queue.push({ ts: arrival.ts + lat, lat: lat, to: n });
			});

			let info = {
				ts: arrival.ts,
				peerCount: this.world.nodes().length,
				hops: 1,
				latency: arrival.lat,
				sender: arrival.to.id(),
				up: nextNodes.length * bytes,
				down: bytes,
			};

			if (arrival.to === from) {
				info.hops = 0;
				info.down = 0;
			}

			out.infos.push(info);
		}

		return out;
	}

	unicast(fw, ts, from, to, bytes) {
		return this.multicast(fw, ts, from, [ to ], bytes);
	}

	async renderActivations() {
		let layout = this.world.elements().layout({
			name: 'euler',
			boundingBox: {
				x1: 0,
				y1: 0,
				w: 1000,
				h: 1000
			},
			randomize: true,
			//gravity: 0,
			animate: false,
			springLength: e => e.data().weight
		});

		layout.run();

		//await new Promise(resolve => layout.on('layoutstop', resolve));

		await require('./save-graph.js')(this.world.elements('node, edge[?active]'), './out/snapshots/mst.png');
		//await require('./save-graph.js')(this.world.elements(), './out/snapshots/full.png');
	}
}

module.exports = Simulation;
