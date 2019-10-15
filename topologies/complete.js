const Topology = require('./topology.js');

module.exports = class Complete extends Topology {
	recompute(world, sim) {
		world.edges().data('active', true);
		world.edges().data('redundant', false);
		return super.recompute(world, sim);
	}
};
