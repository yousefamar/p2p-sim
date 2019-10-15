const fs = require('fs');
const arangojs = require('arangojs');
const aql = arangojs.aql;
const db = new arangojs.Database('http://amar:bashbash@amarwin:8529');

db.useDatabase('iplane');

const ipCol    = db.collection('ips');
const latCol   = db.edgeCollection('latencies');
const latGraph = db.graph('latencies');

(async () => {
	/*
	let startVertex = 'ips/198.133.224.147';

	let result = await db.query(
	//FILTER p.vertices[1].age > 21
		aql`FOR v, e, p IN 1..2 ANY ${startVertex} GRAPH 'latencies'
			FILTER p.edges[*].latCount > 1040
			AND    p.vertices[*].pop != null
			AND    p.vertices[*].lat != null
			AND    p.vertices[*].lon != null
			LIMIT  10
			RETURN v`
	//RETURN p`
	//RETURN { vertices: p.vertices[*]._key }`
	);
	*/

	console.log("Getting 3000 sources of edges with most latency measurements...");

	let cursor = await db.query(
		aql`
			FOR lat IN ${latCol}
				SORT lat.latCount DESC
				LIMIT 10000
				RETURN lat._from
		`
	);

	let nodeSet = new Set();
	while(cursor.hasNext())
		nodeSet.add(await cursor.next());

	let nodes = Array.from(nodeSet);

	console.log("Getting document of", nodes.length, "unique nodes...");

	for (let i = 0, len = nodes.length; i < len; ++i)
		nodes[i] = await ipCol.document(nodes[i]);

	nodes = await Promise.all(nodes);

	nodes = nodes.filter(n => n.lat && n.lon && n.pop);

	console.log(nodes.length, 'nodes valid');

	//nodes = nodes.slice(0, 10)

	console.log("Getting documents of all edges between these nodes...");

	let edges = [];

	for (let i = 0, len = nodes.length; i < len; ++i) {
		for (let j = 0, len = nodes.length; j < len; ++j) {
			if (i === j)
				continue;
			edges.push(latCol.document(nodes[i]._key + '-' + nodes[j]._key, true));
		}
	}

	edges = await Promise.all(edges);

	console.log(edges.length, 'edges gotten');

	console.log("Saving graph...");

	fs.writeFileSync('network.json', JSON.stringify({nodes, edges}));

	console.log("Done");
})();
