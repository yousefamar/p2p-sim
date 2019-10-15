const aql = arangojs.aql;
const db = new arangojs.Database('http://amar:bashbash@localhost:8529');

db.useDatabase('iplane');

const ipCol    = db.collection('ips');
const latCol   = db.edgeCollection('latencies');
const latGraph = db.graph('latencies');

(async () => {

	let graph = window.graph = await (await fetch('iplane/network.json')).json();

	let data = [];

	data.push(...graph.nodes.filter(n => n).map(n => { return { data: { id: n._key }}}));
	data.push(...graph.edges.filter(e => e).map(e => { return { data: { id: e._key, source: e._from.substr(4), target: e._to.substr(4), meanLat: e.meanLat }}}));

	let style = [{
		selector: 'node',
		style: {
			'height': 20,
			'width': 20,
			'background-color': 'darkgrey'
		}
	}, {
		selector: 'edge',
		style: {
			'curve-style': 'haystack',
			'haystack-radius': 0,
			'width': 5,
			'opacity': 0.5,
			'line-color': 'lightgrey'
		}
	}];

	var cyCircle = cytoscape({
		container: document.getElementById('cy-circle'),
		boxSelectionEnabled: false,
		autounselectify: true,
		layout: {
			name: 'circle'
		},
		style: style,
		elements: data
	});

	var cyEuler = window.cyEuler = cytoscape({
		container: document.getElementById('cy-euler'),

		boxSelectionEnabled: false,
		autounselectify: true,

		layout: {
			name: 'euler',
			//gravity: 0,
			//pull: 0,
			randomize: true,
			animate: false,
			springLength: e => e.data().meanLat
		},
		style: style,

		elements: data
	});

	let mst = cyEuler.elements().kruskal(e => e.data().meanLat);
	window.mst = mst;

	var cy2 = cytoscape({
		//container: document.getElementById('cy-euler'),
		headless: true,

		layout: {
			name: 'random',
		},

		elements: data
	});

	var cyMst = cytoscape({
		container: document.getElementById('cy-mst'),

		boxSelectionEnabled: false,
		autounselectify: true,

		layout: {
			name: 'preset'
		},
		style: style,

		elements: cy2.elements().jsons()//mst.jsons()
	});

	const map = L.map('map');

	var cartodbAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>';

	var positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
		attribution: cartodbAttribution
	}).addTo(map);

	map.setView([0, 0], 1);

	graph.nodes.forEach(n => L.marker([n.lat, n.lon]).addTo(map));
})();
