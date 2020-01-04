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
		let currActivations = world.edges('[?active]');
		let prevActivations = world.edges('[?prevActive]');
		let d = prevActivations.diff(currActivations);
		let deltaActivations   = d.right;
		let deltaDeactivations = d.left;

		deltaActivations.forEach(edge => sim.activateEdge(edge));
		deltaDeactivations.forEach(edge => sim.deactivateEdge(edge));

		world.edges().forEach(e => {
			e.data('prevActive', e.data('active'));
		});

		let supersChanged = false;
		world.nodes().forEach(n => {
			if (n.data('super') !== n.data('prevSuper'))
				supersChanged = true;
			n.data('prevSuper', n.data('super'));
		});

		if (supersChanged)
			sim.broadcastSupers(world.nodes('[?super]').map(n => n.id()));

		//return world.elements('node, edge[?active]').floydWarshall();
		//return world.elements('node, edge[?active]').floydWarshall({
		//	weight: e => e.data('lat')
		//});
	}

	preconnect(world, sim) {
		world.edges('[?active]').data('connected', true);

		let currConnections = world.edges('[?connected]');
		let prevConnections = world.edges('[?prevConnected]');
		let d = prevConnections.diff(currConnections);
		let deltaConnections    = d.right;
		let deltaDisconnections = d.left;

		deltaConnections.forEach(edge => sim.connectEdge(edge));
		deltaDisconnections.forEach(edge => sim.disconnectEdge(edge));

		world.edges().forEach(e => {
			e.data('prevConnected', e.data('connected'));
		});
	}
};
