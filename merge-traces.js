const fs = require('fs');
const cliProgress = require('cli-progress');
const MLTraceEmitter = require('./ml-trace-emitter.js');

const dir = '/home/amar/share/mlrecs/';

const droneList = new Set(fs.readFileSync(dir + 'droneList.txt', { encoding: 'utf-8' }).trim().split('\n').map(l => l.split(' ')[1]));

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const startTS  = new Date(2019, 11 - 1, 11).getTime();
const endTS    = new Date(2019, 11 - 1, 18).getTime();

const area = process.argv[2];
if (!area) {
	console.error('Missing area argument');
	process.exit(1);
}
const mergedStream = fs.openSync(dir + 'merged-' + area + '.csv', 'w');

(async () => {
	progressBar.start(endTS - startTS, 0);

	for (let day = 11; day <= 17; ++day) {
		let playback = new MLTraceEmitter(dir + '2019-11-' + day + '-' + area + '-msgs.mlrec', dir + '2019-11-' + day + '-' + area + '-stat.mlrec');

		playback
			.on('time', ts => {
				progressBar.update(ts - startTS);
			})
			.on('spawn', (ts, id, bytes, aoiRadius, x, y) => {
				if (droneList.has(id))
					return;
				fs.writeSync(mergedStream, `s,${ts},${id},${bytes},${aoiRadius},${x},${y}\n`);
			})
			.on('despawn', (ts, id, bytes, aoiRadius) => {
				if (droneList.has(id))
					return;
				fs.writeSync(mergedStream, `d,${ts},${id},${bytes},${aoiRadius}\n`);
			})
			.on('update', (ts, id, bytes, aoiRadius, x, y) => {
				if (droneList.has(id))
					return;
				fs.writeSync(mergedStream, `u,${ts},${id},${bytes},${aoiRadius},${x},${y}\n`);
			})
			.on('aoicast', (ts, id, bytes, aoiRadius) => {
				fs.writeSync(mergedStream, `a,${ts},${id},${bytes},${aoiRadius}\n`);
			});

		playback.start();
		await new Promise(resolve => playback.on('end', resolve));
	}
	progressBar.stop();
})();
