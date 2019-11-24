const fs = require('fs');
const saveGraph = require('./save-graph.js');

let dir = './out/snapshots-json/';
let topos = fs.readdirSync(dir);

topos = [topos[11]];
console.log(topos);

(async () => {
	for (let t of topos) {
		for (let i = 0; i < 500; ++i) {
			let json;
			try {
				i = i.toString().padStart(7, '0');
				json = require(dir + t + '/' + i + '.json');
				await saveGraph(json, './out/snapshots/' + t + '/' + i + '.png');
			} catch (e) {
				console.log(e);
				break;
			}
		}
	}

	console.log('Done');
})();
