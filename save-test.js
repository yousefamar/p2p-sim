const cytoscape = require('cytoscape');
const euler     = require('cytoscape-euler');
cytoscape.use(euler);
const saveGraph = require('./save-graph.js');

let = graph = require('./iplane/network.json');
let = nodes = graph.nodes.map(n => n._key);
let data = [];
data.push(...graph.nodes.filter(n => n).map(n => { return { data: { id: n._key }}}));
data.push(...graph.edges.filter(e => e).map(e => { return { data: { id: e._key, source: e._from.substr(4), target: e._to.substr(4), meanLat: e.meanLat }}}));

let cy = cytoscape({
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

for (var i = 0, len = 5; i < len; i++) {
	saveGraph(cy, './out/test/' + i + '.png');

	cy.nodes()[0].position().x += 5;
}
