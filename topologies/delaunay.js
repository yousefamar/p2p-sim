const Topology = require('./topology.js');
const Delaunator = require('delaunator');

module.exports = class Delaunay extends Topology {
	static getPeerX(peer) {
		return peer.position().x;
	}

	static getPeerY(peer) {
		return peer.position().y;
	}

	recompute(world, sim) {
		super.recompute(world, sim);

		world.edges().data('active', false);

		let peers = world.nodes().toArray();

		// Un-overlap nodes
		for (let i = 0; i < peers.length; ++i) {
			for (let j = i + 1; j < peers.length; ++j) {
				let pos0 = peers[i].position();
				let pos1 = peers[j].position();
				if (pos0.x === pos1.x && pos0.y === pos1.y)
					pos0.x += Math.random() * 0.000001;
			}
		}

		// If there are only two, connect them
		if (peers.length === 2) {
			peers[0].edgesWith(peers[1]).data('active', true);
			return;
		}

		let triangles = Delaunator.from(peers, Delaunay.getPeerX, Delaunay.getPeerY).triangles;
		for (let i = 0; i < triangles.length; i += 3) {
			let a = peers[triangles[i]];
			let b = peers[triangles[i + 1]];
			let c = peers[triangles[i + 2]];
			a.edgesWith(b).data('active', true);
			b.edgesWith(c).data('active', true);
			c.edgesWith(a).data('active', true);
		}
	}
};
