const Topology = require('./topology.js');

module.exports = class Ours extends Topology {
	constructor({ name = this.constructor.name, minK = 1 } = {}) {
		super({ name });
		this.minK = minK;
	}

	recompute(world, sim) {
		let activeStr = 'active' + this.hash;
		//let maxWeight = Math.max(...world.edges().map(e => e.data('weight')));
		// Reset edges
		world.edges().data(activeStr, false);
		world.edges().data('redundant' + this.hash, false);
		world.edges().removeData('modifiedWeight')

		let mst = world.elements().kruskal(e => e.data().weight);
		mst.edges().data(activeStr, true);

		world.nodes().forEach(n => n.data('activeEdgesCount', n.connectedEdges('[?'+activeStr+']').length));

		world.nodes().forEach(n => {
			if (n.data('activeEdgesCount') >= this.minK)
				return;

			let inactive = n.connectedEdges('[!'+activeStr+']');
			inactive.forEach(e => {
				if (e.source().data('activeEdgesCount') < this.minK && e.target().data('activeEdgesCount') < this.minK)
					e.data('modifiedWeight', 0.5 * e.data('weight'));
			});
			inactive = inactive.sort((a, b) => (a.data('modifiedWeight') || a.data('weight')) - (b.data('modifiedWeight') || b.data('weight')));
			inactive.forEach(e => {
				e.data(activeStr, true);
				e.data('redundant' + this.hash, true);
				e.source().data().activeEdgesCount++;
				e.target().data().activeEdgesCount++;
				if (n.data('activeEdgesCount') >= this.minK)
					return false;
			});
		});

		return super.recompute(world, sim);
	}
};
