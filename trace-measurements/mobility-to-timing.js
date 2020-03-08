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
let progress = 0;

let players   = {};
let lifetimes = [];

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
let lastMovement     = startTS;

let lifetimesStream = fs.openSync(dir + area + '-lifetimes.csv', 'w');
fs.writeSync(lifetimesStream, 'lifetime\n');

let movementIntervalStream = fs.openSync(dir + area + '-movement-intervals.csv', 'w');
fs.writeSync(movementIntervalStream, 'intervals\n');

let despawn = (id, ts) => {
	if (!(id in players))
		return;
	fs.writeSync(lifetimesStream, `${ts - players[id].ts}\n`);
	delete players[id];
};

(async () => {
	progressBar.start(endTS - startTS, progress);
	for (let day = 11; day <= 17; ++day) {
		let mobility = readline.createInterface({
			input: fs.createReadStream(dir + '2019-11-' + day + '-' + area + '-mobility.csv')
		});
		for await (const line of mobility) {
			let [ ts, id, x, y ] = line.split(',');
			ts = +ts;

			fs.writeSync(movementIntervalStream, `${ts - lastMovement}\n`);
			lastMovement = ts;

			if (x == null) {
				despawn(id, ts);
			} else {
				x = +x;
				y = -y;
				players[id] = { id, x, y, ts };
			}

			// Despawn zombie players
			for (let player of Object.values(players))
				if (player.ts + oneHourMS < ts)
					despawn(player.id, ts);

			progress = ts - startTS;
			progressBar.update(progress);
		}
	}
	progressBar.stop();
	console.log('Done');
})();
