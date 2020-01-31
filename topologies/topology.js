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
		this.clearstate();
	}

	clearstate() {
		this.updown = {};
	}

	recompute(world, sim) {
		world.edges().forEach(e => {
			e.data('prevActive', e.data('active'));
		});

		world.data('supersChanged', false);
		world.nodes().forEach(n => {
			if (n.data('super') !== n.data('prevSuper'))
				world.data('supersChanged', true);
			n.data('prevSuper', n.data('super'));
		});

		//return world.elements('node, edge[?active]').floydWarshall();
		//return world.elements('node, edge[?active]').floydWarshall({
		//	weight: e => e.data('lat')
		//});
	}

	preconnect(world, sim) {
		world.edges().forEach(e => {
			e.data('prevConnected', e.data('connected'));
		});

		world.edges().data('connected', false);
		world.edges('[?active]').data('connected', true);
	}
};
