const Topology = require('./topology.js');

module.exports = class Complete extends Topology {
	recompute(world, sim) {
		world.edges().data('active' + this.hash, true);
		return super.recompute(world, sim);
	}
};
