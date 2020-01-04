const Topology = require('./topology.js');

module.exports = class AOI extends Topology {
	static dist(a, b) {
		let dx = b.x - a.x;
		let dy = b.y - a.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	constructor({ name = this.constructor.name, aoiRadius = 390 } = {}) {
		super({ name });
		this.aoiRadius = aoiRadius;
	}

	recompute(world, sim) {
		world.edges().data('active', false);

		let peers = world.nodes().toArray();

		for (let i = 0; i < peers.length; ++i) {
			for (let j = i + 1; j < peers.length; ++j) {
				if (AOI.dist(peers[i].position(), peers[j].position()) <= this.aoiRadius)
					peers[i].edgesWith(peers[j]).data('active', true);
			}
		}

		return super.recompute(world, sim);
	}
};
