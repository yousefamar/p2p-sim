const cytosnap = require('cytosnap');
const imageDataURI = require('image-data-uri');

cytosnap.use([ 'cytoscape-euler' ]);

module.exports = async (graph, path, layout = { name: 'preset' }) => {
	let snap = new cytosnap();

	//let r = await new Promise(resolve => setTimeout(resolve, 3000));
	//await new Promise(resolve => graph.ready(resolve));

	let elements = (typeof graph.elements === 'function') ? graph.elements() : graph;

	await snap.start();
	let dataURI = await snap.shot({
		elements: elements.jsons(),
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
			selector: 'edge',
			style: {
				'curve-style': 'haystack',
				'haystack-radius': 0,
				'width': 'mapData(weight, 0, 200, 10, 1)',
				'opacity': 0,
				'line-color': 'lightgrey'
			}
		}, {
			selector: 'edge[?active]',
			style: {
				'opacity': 0.8,
				'line-color': 'black'
			}
		}, {
			selector: 'edge[?redundant]',
			style: {
				'opacity': 0.8,
				'line-color': 'red'
			}
		}],
		resolvesTo: 'base64uri',
		format: 'png',
		width: 1280,
		height: 720,
		background: 'transparent'
	});

	path = await imageDataURI.outputFile(dataURI, path);

	console.log("Image written to", path);

	await snap.stop();
};
