const Router = require('./router.js');

let visit = (node) => {
	node.data('visited', true);
};

module.exports = class Instant extends Router {
	static instance = new Instant();

	multicast(sim, topo, ts, from, tos, bytes) {
		let out = {
			bytesClean: 0,
			bytesCorrupt: 0
		};

		// No receivers -> no traffic
		if (tos.length < 1)
			return out;

		let tree = sim.world.collection();
		tos.forEach(to => {
			let path = topo.fw.path(from, to);
			if (path.edges().length < 1)
				//throw 'Something went horribly, terribly wrong; network disconnected';
				return;
			tree = tree.union(path);
		});

		tree.edges().data('path', true);
		let intermediaries = tree.nodes().filter(n => n !== from && n.neighborhood().edges('[?path]').length > 1);
		tree.edges().data('path', false);

		let evilCount = intermediaries.nodes('[?evil]').length;

		out.bytesCorrupt  = bytes * evilCount;
		out.bytesClean    = bytes * (intermediaries.length - evilCount);

		return out;
	}
};
