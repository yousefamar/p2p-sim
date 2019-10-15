const fs = require('fs');
const Database = require('arangojs').Database;

(async () => {
	const db = new Database('http://amar:bashbash@amarwin:8529');

	db.useDatabase('iplane');

	const latCol = db.edgeCollection('latencies');

	const writeStream = fs.createWriteStream('lat-means.csv');

	let edgesCursor = await latCol.all();
	while(edgesCursor.hasNext()) {
		let edgeDoc = await edgesCursor.next();
		writeStream.write(edgeDoc.meanLat + '\n');
	}
})();
