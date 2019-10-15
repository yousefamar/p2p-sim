module.exports = class Topology {
	constructor({ name = this.constructor.name } = {}) {
		this.name = name;
		this.updown = {};
	}

	recompute(world, sim) {
		return world.elements('node, edge[?active]').floydWarshall({
			weight: e => e.data('lat')
		});
	}
};
