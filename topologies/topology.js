let hash = (str) => {
	var hash = 0;
	if (str.length == 0) {
		return hash;
	}
	for (var i = 0; i < str.length; i++) {
		var char = str.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

module.exports = class Topology {
	constructor({ name = this.constructor.name } = {}) {
		this.name = name;
		this.hash = hash(name);
		this.updown = {};
	}

	recompute(world, sim) {
		return world.elements('node, edge[?active'+this.hash+']').floydWarshall({
			weight: e => e.data('lat')
		});
	}
};
