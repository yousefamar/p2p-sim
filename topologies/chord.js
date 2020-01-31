const Topology = require('./topology.js');

module.exports = class Chord extends Topology {
	recompute(world, sim) {
		super.recompute(world, sim);

		world.edges().data('active', false);

		let peers = world.nodes().toArray();

		for (let i = 0; i < peers.length; ++i)
			for (let k = 0, j = i + Math.pow(2, k); j < i + peers.length; ++k, j = i + Math.pow(2, k))
				peers[i].edgesWith(peers[j % peers.length]).data('active', true);
	}
};
