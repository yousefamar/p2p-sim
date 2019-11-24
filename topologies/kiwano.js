const Topology = require('./topology.js');
const Delaunator = require('delaunator');

module.exports = class Kiwano extends Topology {
	static POWER = 3;

	static getPeerX(peer) {
		return peer.position().x;
	}

	static getPeerY(peer) {
		return peer.position().y;
	}

	recompute(world, sim) {
		let activeStr = 'active' + this.hash;
		world.edges().data(activeStr, false);

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
			peers[0].edgesWith(peers[1]).data(activeStr, true);
			return super.recompute(world, sim);
		}

		let triangles = Delaunator.from(peers, Kiwano.getPeerX, Kiwano.getPeerY).triangles;
		for (let i = 0; i < triangles.length; i += 3) {
			let a = peers[triangles[i]];
			let b = peers[triangles[i + 1]];
			let c = peers[triangles[i + 2]];
			a.edgesWith(b).data(activeStr, true);
			b.edgesWith(c).data(activeStr, true);
			c.edgesWith(a).data(activeStr, true);
		}

		let dist = world.elements('node, edge[?'+activeStr+']').floydWarshall().distance;

		for (let i = 0; i < peers.length; ++i) {
			for (let j = i + 1; j < peers.length; ++j) {
				if (dist(peers[i], peers[j]) <= Kiwano.POWER)
					peers[i].edgesWith(peers[j]).data(activeStr, true);
			}
		}

		return super.recompute(world, sim);
	}
};
