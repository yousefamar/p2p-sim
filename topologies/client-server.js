const Topology = require('./topology.js');

module.exports = class ClientServer extends Topology {
	recompute(world, sim) {
		super.recompute(world, sim);

		let server = world.$id(world.$().id());
		world.data('super', false);
		server.data('super', true);

		world.edges().data('active', false);
		server.connectedEdges().data('active', true);
	}
};
