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
		this.transitions = {
			idle2idle:     0,
			idle2active:   0,
			active2active: 0,
			active2idle:   0,
		};
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

class Group {
	constructor(initalPlayer) {
		this.players  = [ initalPlayer ];
		this.centroid = {
			x: initalPlayer.x,
			y: initalPlayer.y
		};
		this.stable = false;
	}

	recomputeCentroid() {
		this.centroid.x = 0;
		this.centroid.y = 0;
		for (let p of this.players) {
			this.centroid.x += p.x;
			this.centroid.y += p.y;
		}
		this.centroid.x /= this.players.length;
		this.centroid.y /= this.players.length;
	}

	assimilateGroup(group) {
		this.players = this.players.concat(group.players);
		this.recomputeCentroid();
	}

	distTo(coords) {
		let dx = coords.x - this.centroid.x;
		let dy = coords.y - this.centroid.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	canAcceptPlayer(outsider) {
		//if (!outsider.isIdle)
		//	return false;
		for (let player of this.players)
			if (!(outsider.id in player.aoiSet))
				return false;
		return true;
	}

	canAcceptGroup(group) {
		for (let outsider of group.players)
			if (!this.canAcceptPlayer(outsider))
				return false;
		return true;
	}

	closestGroup(groups) {
		return groups.map(g => [g, this.distTo(g.centroid)]).reduce((acc, curr) => acc[1] < curr[1] ? acc : curr)[0];
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
		transitions[id].idle2idle = transitions[id].idle2idleZ;
	} else {
		player = new Player(id, ts, x, y);
		idleTimes[id]   = idleTimes[id] || 0;
		transitions[id] = transitions[id] || {
			idle2idleZ:    0,
			idle2idle:     0,
			idle2active:   0,
			active2active: 0,
			active2idle:   0,
		};
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
	if (!isZombie) {
		let dTS = ts - players[playerID].ts;
		if (dTS >= Player.idleTimeMS)
			idleTimes[playerID] += dTS - Player.idleTimeMS;
		transitions[playerID].idle2idle = transitions[playerID].idle2idleZ;
	}
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

let transSampleIntervalMS = 100; // 100 ms
let transNextSampleTS     = startTS + transSampleIntervalMS;

let players     = {};
let idleTimes   = {};
let hist        = [];
let transitions = {};

let groupCountStream  = fs.openSync(dir + area + '-group-count.csv', 'w');
let groupHistStream   = fs.openSync(dir + area + '-group-hist.csv', 'w');
let idleTimesStream   = fs.openSync(dir + area + '-idle-times.csv', 'w');
let transitionsStream = fs.openSync(dir + area + '-transitions.csv', 'w');
fs.writeSync(transitionsStream, 'id,probability,type\n');

const sum = a => a.reduce((acc, curr) => acc + curr, 0);

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

			while (transNextSampleTS < ts) {
				let idleTimeMSAgo = transNextSampleTS - Player.idleTimeMS;
				for (let p of playersArray) {
					p.prevIdle = p.isIdle;
					p.isIdle   = p.ts >= idleTimeMSAgo;
				}

				for (let p of playersArray) {
					if (p.prevIdle) {
						if (p.isIdle)
							++transitions[p.id].idle2idleZ;
						else
							++transitions[p.id].idle2active;
					} else {
						if (p.isIdle)
							++transitions[p.id].active2idle;
						else
							++transitions[p.id].active2active;
					}
				}

				transNextSampleTS += transSampleIntervalMS;
			}

			while (nextSampleTS < ts) {
				let groups = playersArray.filter(p => p.isIdle).map(p => new Group(p));

				while (groups.find(g => !g.stable)) {
					for (let i = 0; i < groups.length; ++i) {
						let group = groups[i];
						let otherGroups  = groups.filter(g => g !== group && !group.stable && group.canAcceptGroup(g));
						if (otherGroups.length < 1) {
							group.stable = true;
							continue;
						}
						let closestGroup = group.closestGroup(otherGroups);
						group.assimilateGroup(closestGroup);
						groups.splice(groups.indexOf(closestGroup), 1);
					}
				}

				let groupSizes = groups.map(g => g.players.length);

				for (let gs of groupSizes) {
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

	console.log('Writing state transitions...');
	for (let id in transitions) {
		let t = transitions[id];
		delete t.idle2idleZ;
		let totalActive = t.active2active + t.active2idle;
		let totalIdle   = t.idle2active   + t.idle2idle;
		if (totalActive > 0) {
			t.active2active /= totalActive;
			t.active2idle   /= totalActive;
		}
		if (totalIdle > 0) {
			t.idle2active /= totalIdle;
			t.idle2idle   /= totalIdle;
		}
		for (let k in t)
			fs.writeSync(transitionsStream, `${id},${t[k]},${k}\n`);
	}
	console.log('Done');
})();
