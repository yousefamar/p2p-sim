const Router = require('./router.js');

module.exports = class Lats extends Router {
	static instance = new Lats();

	multicast(sim, topo, ts, from, tos, bytes) {
		let out = {
			lats: []
		};

		// No receivers -> no traffic
		if (tos.length < 1)
			return out;

		tos.forEach(to => {
			let path = topo.fw.path(from, to);
			let lat  = topo.fw.distance(from, to);
			out.lats.push(lat);
			if (path.edges().length < 1)
				throw 'Something went horribly, terribly wrong; network disconnected';
		});

		return out;
	}
};
