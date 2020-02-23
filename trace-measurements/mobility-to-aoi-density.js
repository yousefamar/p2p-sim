const fs = require('fs');
const readline = require('readline');
const cliProgress = require('cli-progress');

const dir  = '/home/amar/share/mlrecs/';
const area = process.argv[2];
if (!area) {
	console.error('Missing area argument');
	process.exit(1);
}
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let startTS  = new Date(2019, 11 - 1, 11).getTime();
let endTS    = new Date(2019, 11 - 1, 18).getTime();
let lastTS   = startTS;
let progress = 0;

let players = {};

let isWithinAOI = (a, b, radius) => {
	let dx = b.x - a.x;
	if (Math.abs(dx) > radius)
		return false;
	let dy = b.y - a.y;
	if (Math.abs(dy) > radius)
		return false;
	return Math.sqrt(dx * dx + dy * dy) <= radius;
};

let aoiRadius        = 390;
let sampleIntervalMS = 10 * 60 * 1000; // 10 minutes
let nextSampleTS     = startTS + sampleIntervalMS;
let oneHourMS        = 60 * 60 * 1000;

let meanAOISizeStream = fs.openSync(dir + area + '-mean-aoi-size.csv', 'w');
fs.writeSync(meanAOISizeStream, 'ts,sumAOISize,playerCount\n');

(async () => {
	progressBar.start(endTS - startTS, progress);
	for (let day = 11; day <= 17; ++day) {
		let mobility = readline.createInterface({
			input: fs.createReadStream(dir + '2019-11-' + day + '-' + area + '-mobility.csv')
		});
		for await (const line of mobility) {
			let [ ts, id, x, y ] = line.split(',');
			ts = +ts;

			let playersArray = Object.values(players);

			while (nextSampleTS < ts) {
				let sumAOISize = 0;
				for (let player of playersArray)
					sumAOISize += playersArray.filter(p => player.id !== p.id && isWithinAOI(player, p, aoiRadius)).length;
				fs.writeSync(meanAOISizeStream, `${nextSampleTS},${sumAOISize},${playersArray.length}\n`);
				nextSampleTS += sampleIntervalMS;
			}

			if (x == null) {
				delete players[id];
			} else {
				x = +x;
				y = -y;
				players[id] = { id, x, y, ts };
			}

			// Despawn zombie players
			for (let player of Object.values(players))
				if (player.ts + oneHourMS < ts)
					delete players[player.id];

			progress = ts - startTS;
			progressBar.update(progress);
		}
	}
	progressBar.stop();
	console.log('Done');
})();
