const Topology = require('./topology.js');

module.exports = class Complete extends Topology {
	recompute(world, sim) {
		world.edges().data('active', true);
		return super.recompute(world, sim);
	}
};
