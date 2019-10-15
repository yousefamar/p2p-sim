const fs = require('fs');
const readline = require('readline');
const request  = require('request-promise-native');
const Database = require('arangojs').Database;
const cliProgress = require('cli-progress');


let dateToStr = (strings, year, month, day) => {
	month = month.toString().padStart(2, '0');
	day   =   day.toString().padStart(2, '0');
	return `${year}/${month}/${day}`;
};

let requestLatencies = async (year, month, day) => {
	console.log("Requesting latencies", dateToStr`${year}${month}${day}`);

	let res;

	try {
		res = await request(`http://web.eecs.umich.edu/~harshavm/iplane/iplane_logs/data/${dateToStr`${year}${month}${day}`}/pl_latencies.txt`);
	} catch (e) {
		//console.log(e.statusCode);
		return;
	}

	if (!res.trim())
		return;

	return res.trim().split('\n')
		.map(l => l.split(' '))
		.map(l => { return {
			src: l[0],
			dst: l[1],
			latency: +l[2]
		}});
};


(async () => {
	const db = new Database('http://amar:bashbash@amarwin:8529');

	db.useDatabase('iplane');

	if (!(await db.exists())) {
		console.log("iPlane DB doesn't exist; creating");
		await new Database('http://amar:bashbash@amarwin:8529').createDatabase('iplane');
	}

	const ipCol  = db.collection('ips');
	const latCol = db.edgeCollection('latencies');

	//if (await ipCol.exists())
	//	await ipCol.drop();

	//if (await latCol.exists())
	//	await latCol.drop();

	if (!(await ipCol.exists())) {
		console.log("IP collection doesn't exist; creating");
		await ipCol.create();
	}

	if (!(await latCol.exists())) {
		console.log("Latencies edge collection doesn't exist; creating");
		await latCol.create();
	}

	let processPoPMappings = async () => {
		const popStream = readline.createInterface({ input: fs.createReadStream('ip_to_pop_mapping_with_latlons.txt') });

		for await(let chunk of popStream) {
			chunk = chunk.toString().split(' ');
			chunk = {
				_key: chunk[0],
				pop: +chunk[1],
				lat: +chunk[2],
				lon: +chunk[3],
			};

			let ipDoc  = await ipCol.document(chunk._key, true);
			if (!ipDoc)
				await ipCol.save(chunk);
			else
				await ipCol.update(ipDoc, chunk);
		}
	};

	let processDNSLocs = async () => {
		const locStream = readline.createInterface({ input: fs.createReadStream('dns_based_loc_mapping.txt') });

		for await(let chunk of locStream) {
			chunk = chunk.toString().split(' ');
			chunk = {
				_key: chunk[0],
				loc: +chunk[1]
			};

			let ipDoc  = await ipCol.document(chunk._key, true);
			if (!ipDoc)
				await ipCol.save(chunk);
			else
				await ipCol.update(ipDoc, chunk);
		}
	};

	//await processPoPMappings();
	//await processDNSLocs();

	let latMaxLen = 0;

	/*
	let edgesCursor = await latCol.all();
	while(edgesCursor.hasNext()) {
		let edgeDoc = await edgesCursor.next();
		let allLats = Object.values(edgeDoc.latencies);
		latMaxLen = Math.max(allLats.length, latMaxLen);
		let mean = allLats.length > 1 ? allLats.reduce((a, b) => a + b) / allLats.length : allLats[0];
		await latCol.update(edgeDoc, { meanLat: mean, latCount: allLats.length });
	}
	console.log(latMaxLen);
	*/

	//let startDate = new Date(2006, 6 - 1, 21);
	//let startDate = new Date(2012, 7 - 1, 3);
	let startDate = new Date(2012, 8 - 1, 3);
	let endDate   = new Date(2016, 8 - 1, 15);

	for (let date = startDate; date < endDate; date.setDate(date.getDate() + 1)) {
		let lats = await requestLatencies(date.getFullYear(), date.getMonth() + 1, date.getDate());

		if (!lats) {
			console.log("No latencies for", date);
			continue;
		}

		console.log("Writing latencies to DB");

		const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
		let progress = 0;
		progressBar.start(lats.length, progress);

		for (let lat of lats) {
			let dateJSON = date.toJSON();

			let srcDoc  = await ipCol.document(lat.src, true);
			if (!srcDoc)
				await ipCol.save({ _key: lat.src, hasLats: true });
			else
				await ipCol.update(srcDoc, { hasLats: true });

			let dstDoc  = await ipCol.document(lat.dst, true);
			if (!dstDoc)
				await ipCol.save({ _key: lat.dst, hasLats: true });
			else
				await ipCol.update(dstDoc, { hasLats: true });

			let edgeDoc = await latCol.document(lat.src + '-' + lat.dst, true);
			if (!edgeDoc) {
				await latCol.save({
					_key:      lat.src + '-' + lat.dst,
					_from:     'ips/' + lat.src,
					_to:       'ips/' + lat.dst,
					latencies: { [dateJSON]: lat.latency },
					meanLat:   lat.latency,
					latCount:  1
				});
			} else {
				edgeDoc.latencies[dateJSON] = lat.latency;
				let allLats = Object.values(edgeDoc.latencies);
				latMaxLen = Math.max(allLats.length, latMaxLen);
				let mean = allLats.length > 1 ? allLats.reduce((a, b) => a + b) / allLats.length : allLats[0];
				await latCol.update(edgeDoc, { latencies: edgeDoc.latencies, meanLat: mean, latCount: allLats.length });
			}
			progressBar.update(++progress);
		}
		progressBar.stop();
	}

	console.log('latMaxLen', latMaxLen);
})();
