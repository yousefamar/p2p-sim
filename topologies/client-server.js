const Topology = require('./topology.js');

module.exports = class ClientServer extends Topology {
	recompute(world, sim) {
		let server = world.$id(world.$().id());

		world.edges().data('active', false);
		world.edges().data('redundant', false);
		server.connectedEdges().data('active', true);

		return super.recompute(world, sim);
	}
};
