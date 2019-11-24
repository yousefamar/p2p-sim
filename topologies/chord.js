const Topology = require('./topology.js');

module.exports = class Chord extends Topology {
	recompute(world, sim) {
		world.edges().data('active' + this.hash, false);

		let peers = world.nodes().toArray();

		for (let i = 0; i < peers.length; ++i)
			for (let k = 0, j = i + Math.pow(2, k); j < i + peers.length; ++k, j = i + Math.pow(2, k))
				peers[i].edgesWith(peers[j % peers.length]).data('active' + this.hash, true);

		return super.recompute(world, sim);
	}
};
