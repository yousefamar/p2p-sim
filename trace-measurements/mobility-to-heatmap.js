const fs = require('fs');
const readline = require('readline');
const cliProgress = require('cli-progress');

const dir = '/home/amar/share/mlrecs/';
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let startTS  = new Date(2019, 11 - 1, 11).getTime();
let endTS    = new Date(2019, 11 - 1, 18).getTime();
let lastTS   = startTS;
let progress = 0;

let players = {};
let heat    = [];
let minX    = Infinity;
let maxX    = -Infinity;
let minY    = Infinity;
let maxY    = -Infinity;

(async () => {
	progressBar.start(endTS - startTS, progress);
	for (let day = 11; day <= 17; ++day) {
		let mobility = readline.createInterface({
			input: fs.createReadStream(dir + '2019-11-' + day + '-starbucks-mobility.csv')
		});
		for await (const line of mobility) {
			let [ ts, id, x, y ] = line.split(',');
			ts = +ts;

			for (let player of Object.values(players)) {
				let deltaTS = ts - lastTS;
				let x = Math.floor(player.x);
				let y = Math.floor(player.y);
				heat[x] = heat[x] || [];
				heat[x][y] = heat[x][y] || 0;
				heat[x][y] += deltaTS;
			}

			if (x == null) {
				delete players[id];
				continue;
			}
			x = +x;
			y = -y;
			minX = Math.min(Math.floor(x), minX);
			maxX = Math.max(Math.floor(x), maxX);
			minY = Math.min(Math.floor(y), minY);
			maxY = Math.max(Math.floor(y), maxY);
			players[id] = { x, y };
			lastTS = ts;
			progress = ts - startTS;
			progressBar.update(progress);
		}
	}
	progressBar.stop();

	console.log('Writing heatmap...');
	let heatMapStream = fs.openSync(dir + 'starbucks-heatmap.csv', 'w');
	for (let x = minX; x <= maxX; ++x) {
		for (let y = minY; y <= maxY; ++y) {
			let h = heat[x] == null ? 0 : heat[x][y] == null ? 0 : heat[x][y];
			fs.writeSync(heatMapStream, `${x},${y},${h}\n`);
		}
	}
	console.log('Done');
})();
