const fs = require('fs');
const Database = require('arangojs').Database;

(async () => {
	const db = new Database('http://amar:bashbash@amarwin:8529');

	db.useDatabase('iplane');

	const latCol = db.edgeCollection('latencies');

	const writeStream = fs.createWriteStream('lat-sds.csv');

	let edgesCursor = await latCol.all();
	while(edgesCursor.hasNext()) {
		let edgeDoc = await edgesCursor.next();
		let n       = edgeDoc.latCount;
		let mean    = edgeDoc.meanLat;
		let allLats = Object.values(edgeDoc.latencies);
		let sd      = Math.sqrt(allLats.map(l => Math.pow(l - mean, 2)).reduce((a, b) => a + b) / n);
		writeStream.write(sd + '\n');
	}
})();
