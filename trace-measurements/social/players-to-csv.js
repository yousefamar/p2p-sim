const fs = require('fs');
const cliProgress = require('cli-progress');

const dir = '/home/amar/share/mlrecs/';
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const remainders = fs.readFileSync(dir + 'mift-remainders.txt', 'utf8').trim().split('\n');
const players = JSON.parse(fs.readFileSync(dir + 'players-mift.json')).filter(p => (p.mifts && p.mifts.length) || remainders.includes(p.id));
console.log(players.length, 'mift-related players');

const playersCSVStream = fs.openSync(dir + 'players-with-mifts.csv', 'w');

(async () => {
	let progress = 0;
	progressBar.start(players.length, progress);

	let props = Object.keys(players[0]);

	// Semicolon as delimiter because names can have commas
	fs.writeSync(playersCSVStream, `${props.join(';')}\n`);

	for (let p of players) {
		let out = [];
		for (let prop of props)
			out.push(p[prop]);
		fs.writeSync(playersCSVStream, `${out.join(';')}\n`);
		progressBar.update(++progress);
	}

	progressBar.stop();
})();
