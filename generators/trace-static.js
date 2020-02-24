const fs = require('fs');
const cliProgress = require('cli-progress');

const dir = './traces/';
const area = 'starbucks';

const startTS  = new Date(2019, 11 - 1, 11).getTime();
const endTS    = startTS + 10000;
//const endTS    = new Date(2019, 11 - 1, 18).getTime();

module.exports = async function* () {
	const traceStream = fs.createReadStream(dir + 'merged' + '-' + area + '.csv');
	const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
	progressBar.start(endTS - startTS, 0);
	let buffer = '';
	let out;
	for await (const chunk of traceStream) {
		buffer += chunk;
		let nlID;
		while ((nlID = buffer.indexOf('\n')) >= 0) {
			out = buffer.slice(0, nlID).split(',');
			if (+out[1] > endTS) {
				progressBar.stop();
				console.log();
				return;
			}
			yield out;
			progressBar.update(out[1] - startTS);
			buffer = buffer.slice(nlID + 1);
		}
	}
	if (buffer.length > 0)
		yield buffer.split(',');
	progressBar.stop();
	console.log();
};
