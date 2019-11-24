const cytosnap = require('cytosnap');
const imageDataURI = require('image-data-uri');

cytosnap.use([ 'cytoscape-euler' ]);

let snap = null;

module.exports = async (graph, path, layout = { name: 'preset', fit: false }) => {
	layout.zoom = 0.5;
	layout.boundingBox = {
		x1: 0,
		y1: 0,
		w: 2000,
		h: 2000
	};
	if (!snap) {
		snap = new cytosnap();
		await snap.start();
	}

	//let r = await new Promise(resolve => setTimeout(resolve, 3000));
	//await new Promise(resolve => graph.ready(resolve));

	let elements = (typeof graph.elements === 'function') ? graph.elements() : graph;
	elements = (typeof elements.jsons === 'function') ? elements.jsons() : elements;
	let hash = elements[0].topoHash || '';

	let dataURI = await snap.shot({
		elements: elements,
		layout: layout,
		style: [{
			selector: 'node',
			style: {
				'height': 20,
				'width': 20,
				'background-color': 'darkgrey',
				'label': 'data(shortID)',
				'text-outline-color': '#888',
				'text-outline-width': 3
			}
		}, {
			selector: 'node[?super'+hash+']',
			style: {
				'background-color': 'red',
			}
		}, {
			selector: 'edge',
			style: {
				'curve-style': 'haystack',
				'haystack-radius': 0,
				'width': 'mapData(weight, 0, 200, 10, 1)',
				'opacity': 0,
				'line-color': 'lightgrey'
			}
		}, {
			selector: 'edge[?active'+hash+']',
			style: {
				'opacity': 0.8,
				'line-color': 'black'
			}
		}, {
			selector: 'edge[?redundant'+hash+']',
			style: {
				'opacity': 0.8,
				'line-color': 'red'
			}
		}],
		resolvesTo: 'base64uri',
		format: 'png',
		width: 1000,
		height: 1000,
		//width: 1280,
		//height: 720,
		background: 'transparent'
	});

	path = await imageDataURI.outputFile(dataURI, path);

	console.log("Image written to", path);

	//await snap.stop();
};
