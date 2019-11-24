const Topology = require('./topology.js');

module.exports = class ClientServer extends Topology {
	recompute(world, sim) {
		let server = world.$id(world.$().id());
		world.data('super' + this.hash, false);
		server.data('super' + this.hash, true);

		world.edges().data('active' + this.hash, false);
		server.connectedEdges().data('active' + this.hash, true);

		return super.recompute(world, sim);
	}
};
