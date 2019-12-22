const fs = require('fs');
const readline = require('readline');
const cliProgress = require('cli-progress');

const dir = '/home/amar/share/mlrecs/';
const area = '3';
const binSizeMS = 10 * 60 * 1000; // 10 mins
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let startTS  = new Date(2019, 11 - 1, 11).getTime();
let endTS    = new Date(2019, 11 - 1, 18).getTime();
let progress = 0;

let groupCountMeanStream = fs.openSync(dir + area + '-group-count-mean.csv', 'w');

(async () => {
	progressBar.start(endTS - startTS, progress);
	let groupCount = readline.createInterface({
		input: fs.createReadStream(dir + area + '-group-count.csv')
	});

	let groupCountSum = 0;
	let lineCount     = 0;
	let lastTS        = null;

	for await (const line of groupCount) {
		let [ ts, gc ] = line.split(',');
		ts = Math.floor(+ts / binSizeMS) * binSizeMS;
		gc = +gc;

		if (ts > lastTS) {
			fs.writeSync(groupCountMeanStream, `${ts},${groupCountSum/lineCount}\n`);
			groupCountSum = 0;
			lineCount     = 0;
		}
		groupCountSum += gc;
		++lineCount;

		lastTS = ts;
		progress = ts - startTS;
		progressBar.update(progress);
	}
	fs.writeSync(groupCountMeanStream, `${lastTS},${groupCountSum/lineCount}\n`);
	progressBar.stop();
})();
