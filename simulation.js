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
	constructor(chanceOfEvil = 0.0) {
		this.chanceOfEvil = chanceOfEvil;
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
		this.world.nodes(`[ id != "${player.id}"]`).forEach(other => {
			this.world.add({
				data: {
					id: player.id + '-' + other.id(),
					source: player.id,
					target: other.id(),
					active: false,
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

	despawn(peer) {
		this.network.releaseIP(peer.data('ip'));
		this.world.remove(peer);
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
