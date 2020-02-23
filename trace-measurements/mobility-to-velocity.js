const fs = require('fs');
const readline = require('readline');
const cliProgress = require('cli-progress');

const dir = '/home/amar/share/mlrecs/';
const area = process.argv[2];
if (!area) {
	console.error('Missing area argument');
	process.exit(1);
}
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

let startTS   = new Date(2019, 11 - 1, 11).getTime();
let endTS     = new Date(2019, 11 - 1, 18).getTime();
let progress  = 0;
let oneHourMS = 60 * 60 * 1000;

let players = {};
let heat    = [];
let minX    = Infinity;
let maxX    = -Infinity;
let minY    = Infinity;
let maxY    = -Infinity;

let cheaterMap = {};

const speedLimit    = 130;
let totalMovements  = 0;
let hackedMovements = 0;

(async () => {
	progressBar.start(endTS - startTS, progress);
	for (let day = 11; day <= 17; ++day) {
		let mobility = readline.createInterface({
			input: fs.createReadStream(dir + '2019-11-' + day + '-' + area + '-mobility.csv')
		});
		for await (const line of mobility) {
			let [ ts, id, x, y ] = line.split(',');
			ts = +ts;
			if (x == null) {
				delete players[id];
			} else {
				x = +x;
				y = -y;
				if (id in players) {
					let p = players[id];
					let dt = ts - p.ts;
					if (dt > 0) {
						let vx = (x - p.x) / dt;
						let vy = (y - p.y) / dt;
						let speed = Math.sqrt(vx * vx + vy * vy);
						++totalMovements;
						cheaterMap[id] = cheaterMap[id] || false;
						if (speed > speedLimit) {
							++hackedMovements;
							cheaterMap[id] = true;
						}
						let ix = Math.floor(p.x);
						let iy = Math.floor(p.y);
						heat[ix] = heat[ix] || [];
						heat[ix][iy] = heat[ix][iy] || { svx: 0, svy: 0, n: 0 };
						heat[ix][iy].svx += vx;
						heat[ix][iy].svy += vy;
						heat[ix][iy].n++;
					}
				}

				let ix = Math.floor(x);
				let iy = Math.floor(y);
				minX = Math.min(ix, minX);
				maxX = Math.max(ix, maxX);
				minY = Math.min(iy, minY);
				maxY = Math.max(iy, maxY);
				players[id] = { ts, x, y };
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

	console.log('Writing vector field...');
	let heatMapStream = fs.openSync(dir + area + '-velocities.csv', 'w');
	let zz = { svx: 0, svy: 0, n: 1 };
	for (let x = minX; x <= maxX; ++x) {
		for (let y = minY; y <= maxY; ++y) {
			let h = heat[x] == null ? zz : heat[x][y] == null ? zz : heat[x][y];
			fs.writeSync(heatMapStream, `${x},${y},${h.svx/h.n},${h.svy/h.n}\n`);
		}
	}
	console.log('Done');

	console.log('totalMovements', totalMovements);
	console.log('hackedMovements', hackedMovements);
	console.log('Total players seen', Object.values(cheaterMap).length);
	console.log('Total players seen hacking', Object.values(cheaterMap).filter(p => p).length);
})();
