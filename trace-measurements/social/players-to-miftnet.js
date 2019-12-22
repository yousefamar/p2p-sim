const fs = require('fs');
const cliProgress = require('cli-progress');

const dir = '/home/amar/share/mlrecs/';
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const players = JSON.parse(fs.readFileSync(dir + 'players-mift.json')).filter(p => p.mifts && p.mifts.length);

const miftNetStream = fs.openSync(dir + 'miftnet.csv', 'w');

(async () => {
	let progress = 0;
	progressBar.start(players.length, progress);

	fs.writeSync(miftNetStream, `Source,Target,Weight\n`);

	for (let p of players) {
		for (let m of p.mifts)
			fs.writeSync(miftNetStream, `${m.fromId},${m.toId},1\n`);
		progressBar.update(++progress);
	}

	progressBar.stop();
})();
