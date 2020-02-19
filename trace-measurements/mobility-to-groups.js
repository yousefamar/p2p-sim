const fs = require('fs');
const readline = require('readline');
const cliProgress = require('cli-progress');

class Player {
	static idleTimeMS = 3000;
	constructor(id, ts, x, y) {
		this.id = id;
		this.ts = ts;
		this.x  = x;
		this.y  = y;
		this.isIdle = false;
	}

	isPlayerWithinAOI(aoiR, player) {
		let dx = Math.abs(player.x - this.x);
		if (Math.abs(dx) > aoiR)
			return false;
		let dy = Math.abs(player.y - this.y);
		if (Math.abs(dy) > aoiR)
			return false;
		return Math.sqrt(dx * dx + dy * dy) <= aoiR;
	}

	updateAOISet(aoiR, players) {
		this.aoiSet = {};
		for (let id in players) {
			if (id === this.id)
				continue;
			let p = players[id];
			if (this.isPlayerWithinAOI(aoiR, p))
				this.aoiSet[p.id] = p;
		}
	}
}

function upsertPlayer(id, ts, x, y) {
	let player = players[id];
	if (player != null) {
		let dTS = ts - player.ts;
		if (dTS >= Player.idleTimeMS)
			idleTimes[id] += dTS - Player.idleTimeMS;
		player.ts = ts;
		player.x  = x;
		player.y  = y;
	} else {
		player = new Player(id, ts, x, y);
		idleTimes[id] = idleTimes[id] || 0;
	}
	for (let id in players) {
		let p = players[id];
		if (p.isPlayerWithinAOI(aoiR, player))
			p.aoiSet[player.id] = player;
		else
			delete p.aoiSet[player.id];
	}
	player.updateAOISet(aoiR, players);
	players[player.id] = player;
}

function removePlayer(playerID, ts, isZombie) {
	if (!(playerID in players))
		return;
	let dTS = ts - players[playerID].ts;
	if (dTS >= Player.idleTimeMS && !isZombie)
		idleTimes[playerID] += dTS - Player.idleTimeMS;
	for (let id in players)
		delete players[id].aoiSet[playerID];
	delete players[playerID];
}

const dir = '/home/amar/share/mlrecs/';
const area = process.argv[2];
if (!area) {
	console.error('Missing area argument');
	process.exit(1);
}
const aoiR = 390 / 3;

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let startTS  = new Date(2019, 11 - 1, 11).getTime();
let endTS    = new Date(2019, 11 - 1, 18).getTime();
let progress = 0;

let sampleIntervalMS = 10 * 60 * 1000; // 10 minutes
let nextSampleTS     = startTS + sampleIntervalMS;
let oneHourMS        = 60 * 60 * 1000;

let players   = {};
let idleTimes = {};
let hist      = [];

function visit(player) {
	if (!player.isIdle || player.visited)
		return 0;
	player.visited = true;
	let sum = 1;
	for (let id in player.aoiSet)
		sum += visit(player.aoiSet[id]);
	return sum;
}

let groupCountStream = fs.openSync(dir + area + '-group-count.csv', 'w');
let groupHistStream  = fs.openSync(dir + area + '-group-hist.csv', 'w');
let idleTimesStream  = fs.openSync(dir + area + '-idle-times.csv', 'w');

const sum = a => a.reduce((agg, curr) => agg + curr, 0);

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
				for (let p of playersArray)
					p.visited = false;

				let groupSizes = [];

				for (let p of playersArray) {
					if (!p.isIdle || p.visited)
						continue;
					let gs = visit(p);
					groupSizes.push(gs);
					hist[gs] = hist[gs] || 0;
					++hist[gs];
				}

				fs.writeSync(groupCountStream, `${nextSampleTS},${sum(groupSizes)},${groupSizes.length}\n`);
				nextSampleTS += sampleIntervalMS;
			}

			if (x == null) {
				removePlayer(id, ts);
			} else {
				x = +x;
				y = -y;
				upsertPlayer(id, ts, x, y);
			}

			// Despawn zombie players
			for (let id in players)
				if (players[id].ts + oneHourMS < ts)
					removePlayer(id, ts, true);

			let idleTimeMSAgo = ts - Player.idleTimeMS;
			for (let p of playersArray)
				p.isIdle = p.ts >= idleTimeMSAgo;

			progress = ts - startTS;
			progressBar.update(progress);
			//if (progress > 1863420)
			//	break;
		}
		//break;
	}
	progressBar.stop();

	console.log('Writing histogram...');
	for (let i = 1, len = hist.length; i < len; ++i) {
		let h = hist[i] || 0;
		fs.writeSync(groupHistStream, `${i},${h}\n`);
	}
	console.log('Done');

	console.log('Writing idle times...');
	for (let id in idleTimes) {
		let t = idleTimes[id];
		fs.writeSync(idleTimesStream, `${id},${t}\n`);
	}
	console.log('Done');
})();
