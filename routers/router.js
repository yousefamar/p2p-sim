let isWithinAOI = (a, b, radius) => {
	let dx = b.x - a.x;
	if (Math.abs(dx) > radius)
		return false;
	let dy = b.y - a.y;
	if (Math.abs(dy) > radius)
		return false;
	return Math.sqrt(dx * dx + dy * dy) <= radius;
};

module.exports = class Router {
	aoicast(sim, topo, ts, from, bytes, aoiRadius) {
		let tos = sim.world.nodes(`[ id != "${from.id()}"]`).filter(to => isWithinAOI(from.position(), to.position(), aoiRadius));
		return this.multicast(sim, topo, ts, from, tos, bytes);
	}

	broadcast(sim, topo, ts, from, bytes) {
		let tos = sim.world.nodes(`[ id != "${from.id()}"]`);
		return this.multicast(sim, topo, ts, from, tos, bytes);
	}

	unicast(sim, topo, ts, from, to, bytes) {
		return this.multicast(sim, topo, ts, from, [ to ], bytes);
	}

	multicast(sim, topo, ts, from, tos, bytes) {
		throw 'Unimplemented';
	}
};
