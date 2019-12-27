const Router = require('./router.js');

module.exports = class Optimal extends Router {
	static instance = new Optimal();

	multicast(sim, topo, ts, from, tos, bytes) {
		let out = {
			lats: [],
			infos: []
		};

		// No receivers -> no traffic
		if (tos.length < 1)
			return out;

		let paths = sim.world.collection();
		tos.forEach(to => {
			let path = topo.fw.path(from, to);
			let lat  = topo.fw.distance(from, to);
			out.lats.push(lat);
			if (path.edges().length < 1)
				throw 'Something went horribly, terribly wrong; network disconnected';
			paths = paths.union(path);
		});

		// This would be so much simpler recursive
		sim.world.nodes().data('visited', true);
		paths.nodes().data('visited', false);
		let queue = [
			{ ts: +ts, lat: 0, to: from }
		];

		while (queue.length > 0) {
			let arrival = queue.shift();
			arrival.to.data('visited', true);

			// Store info in node
			if (queue.to !== from) {
				let remote = arrival.to;
				remote.data().topos = remote.data().topos || {};
				remote.data().topos[topo.name] = remote.data().topos[topo.name] || {};
				let t = remote.data().topos[topo.name];
				t.poss = t.poss || {};
				t.poss[from.id()] = t.poss[from.id()] || [];
				t.poss[from.id()].push({
					ts: arrival.ts,
					x: from.position().x,
					y: from.position().y
				});
			}

			let nextNodes = arrival.to.openNeighborhood('[!visited]').nodes();

			nextNodes.forEach(n => {
				let lat = +arrival.to.edgesWith(n).data('lat');
				queue.push({ ts: arrival.ts + lat, lat: lat, to: n });
			});

			let info = {
				ts: arrival.ts,
				peerCount: sim.world.nodes().length,
				hops: 1,
				latency: arrival.lat,
				sender: arrival.to.id(),
				up: nextNodes.length * bytes,
				down: bytes,
			};

			if (arrival.to === from) {
				info.hops = 0;
				info.down = 0;
			}

			out.infos.push(info);
		}

		return out;
	}
};
