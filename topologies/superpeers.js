const Topology = require('./topology.js');
const skmeans = require('skmeans');

module.exports = class Superpeers extends Topology {
	static distToCentroid(a, b) {
		let dx = b[0] - a.x;
		let dy = b[1] - a.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	constructor({ name = this.constructor.name, superpeerCount = 2, shouldUseKmeans = false } = {}) {
		super({ name });
		this.superpeerCount  = superpeerCount;
		this.shouldUseKmeans = shouldUseKmeans;
	}

	recompute(world, sim) {
		world.edges().data('active', false);
		world.nodes().data('super', false);

		let peers = world.nodes().toArray();

		if (!this.shouldUseKmeans) {
			let supers = peers.splice(0, this.superpeerCount);
			supers.forEach(s => s.data('super', true));
			world.nodes('[?super]').edgesWith(world.nodes('[?super]')).data('active', true);
			// Round-robin them across the supers
			for (let i = 0; i < peers.length; ++i) {
				let j = i % this.superpeerCount;
				peers[i].edgesWith(supers[j]).data('active', true);
			}
			return super.recompute(world, sim);
		}

		if (world.nodes().length !== this.lastLen || world.nodes('[!kMeansed' + this.superpeerCount + ']').nonempty()) {
			let poss = peers.map(p => [ p.data('netPos').x, p.data('netPos').y ]);
			this.lastSkmeans = skmeans(poss, Math.min(this.superpeerCount, peers.length), 'kmpp');
		}
		let res = this.lastSkmeans;

		world.nodes().data('kMeansed' + this.superpeerCount, true);
		this.lastLen = world.nodes().length;

		let supers = [];

		// Get peers closest to centroids
		for (let c of res.centroids) {
			let smallestDist  = Infinity;
			let closestPeerID = 0;
			for (let i = 0; i < peers.length; ++i) {
				let d = Superpeers.distToCentroid(peers[i].position(), c);
				if (d < smallestDist)
					closestPeerID = i;
			}
			supers.push(peers.splice(closestPeerID, 1)[0]);
		}

		supers.forEach(s => s.data('super', true));
		world.nodes('[?super]').edgesWith(world.nodes('[?super]')).data('active', true);

		peers = world.nodes().toArray();
		for (let i = 0; i < res.idxs.length; ++i)
			peers[i].edgesWith(supers[res.idxs[i]]).data('active', true);

		return super.recompute(world, sim);
	}
};
