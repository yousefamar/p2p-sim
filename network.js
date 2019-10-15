const cytoscape = require('cytoscape');
const euler     = require('cytoscape-euler');
cytoscape.use(euler);

class PLNetwork {
	constructor() {
		this.graph = require('./iplane/network.json');
		this.nodes = this.graph.nodes.map(n => n._key);
		this.pool  = this.nodes.slice(0);
	}

	async init() {
		let data = [];

		data.push(...this.graph.nodes.filter(n => n).map(n => { return { data: { id: n._key }}}));
		data.push(...this.graph.edges.filter(e => e).map(e => { return { data: { id: e._key, source: e._from.substr(4), target: e._to.substr(4), meanLat: e.meanLat }}}));

		this.cy = cytoscape({
			elements: data,
			layout: {
				name: 'euler',
				boundingBox: {
					x1: 0,
					y1: 0,
					w: 500,
					h: 500
				},
				//gravity: 0,
				//pull: 0,
				randomize: true,
				animate: false,
				springLength: e => e.data().meanLat
			}
		});

		await new Promise(resolve => this.cy.ready(resolve));

		let dist = (a, b) => {
			let dx = b.x - a.x;
			let dy = b.y - a.y;
			return Math.sqrt(dx * dx + dy * dy);
		};

		this.cy.nodes().forEach(n => {
			this.cy.nodes().difference(n.neighborhood().nodes()).forEach(m => {
				this.cy.add({
					data: {
						id: n.id() + '-' + m.id(),
						source: n.id(),
						target: m.id(),
						meanLat: dist(n.position(), m.position()),
						estimated: true
					}
				});
			});
		});

		/*
		// Confirm fully connected
		this.cy.nodes().forEach(n => {
			console.log(this.cy.nodes().difference(n.neighborhood().nodes()).length);
		});
		*/

		//await require('./save-graph.js')(this.cy, './snapshots/test2.png');

		this.fw = this.cy.elements().floydWarshall({
			weight: e => e.data('meanLat')
		});

		/*
		let dists    = [];
		let pathLens = [];

		for (let i = 0, lenI = network.nodes.length; i < lenI; ++i) {
			let n1 = network.nodes[i];
			for (let j = 0, lenJ = i; j < lenJ; ++j) {
				let n2 = network.nodes[j];

				let dist = fw.distance(`[id = "${n1}"]`, `[id = "${n2}"]`);
				let path = fw.path(`[id = "${n1}"]`, `[id = "${n2}"]`);

				if (dist === 0)
					console.log('0 dist', n1, n2);
				if (path.length === 11)
					console.log('11 len', n1, n2, dist);

				dists.push(dist);
				pathLens.push(path.length);
			}
		}

		console.log('Max pathLen:', Math.max(...pathLens));
		console.log('Min dist:', Math.min(...dists));
		console.log('Max dist:', Math.max(...dists));
		*/
	}

	getIP() {
		if (this.pool.length < 1)
			throw 'PL IP pool exhausted!';
		return this.pool.shift();
	}

	releaseIP(ip) {
		return this.pool.push(ip);
	}

	dist = (() => {
		let cache = {};

		return (n1, n2) => {
			let key = n1 + '-' + n2;
			if (key in cache)
				return cache[key];
			return cache[key] = this.fw.distance(`[id = "${n1}"]`, `[id = "${n2}"]`);
		};
	})();
}

module.exports = {
	PLNetwork
};
