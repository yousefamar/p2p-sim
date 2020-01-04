const fs = require('fs');
const cliProgress = require('cli-progress');
const MLTraceEmitter = require('../ml-trace-emitter.js');

const dir = '/home/amar/share/mlrecs/';
const day = process.argv[2];
if (!day) {
	console.error('Missing day argument');
	process.exit(1);
}
const mobilityStream = fs.openSync(dir + '2019-11-' + day + '-starbucks-mobility.csv', 'w');

const playback = new MLTraceEmitter(dir + '2019-11-' + day + '-starbucks-msgs.mlrec', dir + '2019-11-' + day + '-starbucks-stat.mlrec');

const droneList = new Set(fs.readFileSync(dir + 'droneList.txt', { encoding: 'utf-8' }).trim().split('\n').map(l => l.split(' ')[1]));

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let progress = 0, startTS = 0, endTS = new Date(2019, 11 - 1, 1 + +day).getTime();

playback
	.once('time', ts => {
		startTS = ts;
		progress = ts - startTS;
		progressBar.start(endTS - startTS, progress);
	})
	.on('end', () => {
		progressBar.stop();
	})
	.on('time', ts => {
		progress = ts - startTS;
		progressBar.update(progress);
	})
	.on('spawn', player => {
		if (droneList.has(player.id))
			return;
		fs.writeSync(mobilityStream, `${player.ts},${player.id},${player.x},${player.y}\n`);
	})
	.on('despawn', (id, ts) => {
		if (droneList.has(id))
			return;
		fs.writeSync(mobilityStream, `${ts},${id}\n`);
	})
	.on('update', (id, x, y, ts) => {
		if (droneList.has(id))
			return;
		fs.writeSync(mobilityStream, `${ts},${id},${x},${y}\n`);
	});

playback.start();
