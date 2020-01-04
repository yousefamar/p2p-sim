const Topology = require('./topology.js');

module.exports = class Ours extends Topology {
	constructor({ name = this.constructor.name, minK = 1 } = {}) {
		super({ name });
		this.minK = minK;
	}

	recompute(world, sim) {
		//let maxWeight = Math.max(...world.edges().map(e => e.data('weight')));
		// Reset edges
		world.edges().data('active', false);
		world.edges().data('redundant', false);
		world.edges().removeData('modifiedWeight')

		let mst = world.elements().kruskal(e => e.data().weight);
		mst.edges().data('active', true);

		world.nodes().forEach(n => n.data('activeEdgesCount', n.connectedEdges('[?'+'active'+']').length));

		world.nodes().forEach(n => {
			if (n.data('activeEdgesCount') >= this.minK)
				return;

			let inactive = n.connectedEdges('[!'+'active'+']');
			inactive.forEach(e => {
				if (e.source().data('activeEdgesCount') < this.minK && e.target().data('activeEdgesCount') < this.minK)
					e.data('modifiedWeight', 0.5 * e.data('weight'));
			});
			inactive = inactive.sort((a, b) => (a.data('modifiedWeight') || a.data('weight')) - (b.data('modifiedWeight') || b.data('weight')));
			inactive.forEach(e => {
				e.data('active', true);
				e.data('redundant', true);
				e.source().data().activeEdgesCount++;
				e.target().data().activeEdgesCount++;
				if (n.data('activeEdgesCount') >= this.minK)
					return false;
			});
		});

		return super.recompute(world, sim);
	}

	preconnect(world, sim) {
		world.edges().data('connected', false);

		world.nodes().forEach(n => {
			n.neighborhood().edges()
				.filter(edge => sim.inWideAOI(edge.source().position(), edge.target.position()))
				.data('connected', true);
		});

		return super.preconnect(world, sim);
	}
};
