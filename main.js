const fs = require('fs');
const cliProgress = require('cli-progress');
const Simulation = require('./simulation.js');
const MLTracePlayback = require('./ml-trace-playback.js');
const topologies = require('./topologies.js');
const saveGraph = require('./save-graph.js');
const exitHook = require('exit-hook');

const TAKE_SNAPS    = false;
const WRITE_TRAFFIC = false;

let sim = new Simulation();
let playback = new MLTracePlayback('mlrecs/2019-08-12-starbucks-msgs.mlrec', 'mlrecs/2019-08-12-starbucks-stat.mlrec');

let topos = Object.entries({
	'ClientServer': {},
	'Complete': {},
	// FIXME: AOI radius is hardcoded in here
	'AOI': { aoiRadius: 390 },
	'Delaunay': {},
	'Kiwano': {},
	'Chord': {},
	'Superpeers (n = 2)': { cls: 'Superpeers', superpeerCount: 2 },
	'Superpeers (n = 3)': { cls: 'Superpeers', superpeerCount: 3 },
	'SuperpeersK (n = 2)': { cls: 'Superpeers', superpeerCount: 2, shouldUseKmeans: true },
	'SuperpeersK (n = 3)': { cls: 'Superpeers', superpeerCount: 3, shouldUseKmeans: true },
	'Ours (minK = 1)': { cls: 'Ours', minK: 1 },
	'Ours (minK = 2)': { cls: 'Ours', minK: 2 }
}).map(t => {
	t[1].name = t[0];
	return new topologies[t[1].cls || t[0]](t[1]);
});

let nextSnap     = 0;
let snapInterval = 5000;
let takeSnap     = false;

const trafficStream     = fs.createWriteStream('./out/traffic.csv');
const latencyStream     = fs.createWriteStream('./out/latency.csv');
const connectionsStream = fs.createWriteStream('./out/connections.csv');

let recomputeTopologies = () => {
	let save = sim.snap;
	if (save)
		sim.snap = false;
	topos.forEach(t => {
		t.fw = t.recompute(sim.world, sim)
		if (TAKE_SNAPS)
			t.last = sim.world.elements().clone();
		connectionsStream.write(`${sim.world.nodes().length},${sim.world.edges('[?active]').length},${t.name}\n`);
	});
};

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let progress = 0, startTS = 0, endTS = 1565654399994;

let msgID = 0;

let infoToLines = (info, topo, msgID) => {
	return info
		.map(i => [ i.ts, i.peerCount, i.hops, i.latency, i.sender, i.up, i.down, topo.name, msgID ].join(','))
		.join('\n');
};

exitHook(() => {
	console.log();
	console.log('Saving uploads and downloads before exiting...');

	let lines = '';

	for (let t of topos) {
		for (let id in t.updown) {
			let updown = t.updown[id];
			lines += (`${id},${t.name},${updown.up},${updown.down}\n`);
		}
	}

	fs.writeFileSync('./out/updown.csv', lines);
	console.log('Done');
});

playback
	.once('time', ts => {
		startTS = ts;
		progress = ts - startTS;
		progressBar.start(endTS - startTS, progress);
		nextSnap = ts;
	})
	.on('end', () => {
		progressBar.stop();
	})
	.on('time', ts => {
		progress = ts - startTS;
		progressBar.update(progress);
		if (!TAKE_SNAPS || ts < nextSnap)
			return;
		playback.pause();
		console.log('Playback paused (to take pic)');
		Promise.all(topos.map(t => {
			t.snapsTaken = t.snapsTaken || 0;
			return saveGraph(t.last, './out/snapshots/' + t.name + '/' + (t.snapsTaken++).toString().padStart(7, '0') + '.png');
		})).then(() => {
			console.log('Playback resumed');
			playback.resume();
		});
		nextSnap += snapInterval;
	})
	.on('spawn', player => {
		let peer = sim.getPeer(player.id);
		if (peer.length > 0) {
			//console.error('Player that already spawned spawned again', player.id);
			sim.updatePos(peer, player.x, player.y);
		} else {
			sim.spawn(player);
		}
		recomputeTopologies();
	})
	.on('despawn', id => {
		let peer = sim.getPeer(id);
		if (peer.length < 1) {
			//console.error('Player that never spawned despawned', id);
			return;
		}
		sim.despawn(peer);
		recomputeTopologies();
	})
	.on('update', (id, x, y) => {
		let peer = sim.getPeer(id);
		if (peer.length < 1) {
			//console.error('Player that never spawned got update', id);
			return;
		}
		sim.updatePos(peer, x, y);
		recomputeTopologies();
	})
	.on('aoicast', (ts, id, bytes, aoiRadius) => {
		let peer = sim.getPeer(id);
		if (peer.length < 1) {
			//console.error('Player that never spawned aoicasted', id);
			return;
		}
		for (let t of topos) {
			let out = sim.aoicast(t.fw, ts, peer, bytes, aoiRadius);
			for (let lat of out.lats)
				latencyStream.write(`${lat},${t.name}\n`);

			for (let i of out.infos) {
				let updown = t.updown[i.sender] = t.updown[i.sender] || { up: 0, down: 0 };
				updown.up   += i.up;
				updown.down += i.down;
			}

			if (!WRITE_TRAFFIC)
				continue;
			let lines = infoToLines(out.infos, t, msgID);
			if (lines)
				trafficStream.write(lines + '\n');
		};
		++msgID;
	})
	.on('broadcast', (ts, id, bytes) => {
		let peer = sim.getPeer(id);
		if (peer.length < 1) {
			//console.error('Player that never spawned broadcasted', id);
			return;
		}
		topos.forEach(t => {
			let out = sim.broadcast(t.fw, ts, peer, bytes);
			if (!WRITE_TRAFFIC)
				return;
			let lines = infoToLines(out.infos, t, msgID);
			if (lines)
				trafficStream.write(lines + '\n');
		});
		++msgID;
	})
	.on('unicast', (ts, id, to, bytes) => {
		let peer  = sim.getPeer(id);
		if (peer.length < 1) {
			//console.error('Player that never spawned unicasted', id);
			return;
		}
		let other = sim.getPeer(to);
		if (other.length < 1) {
			//console.error('Player', id, 'tried to unicast to a player', to, 'who never spawned');
			return;
		}
		topos.forEach(t => {
			let out = sim.unicast(t.fw, ts, peer, other, bytes);
			if (!WRITE_TRAFFIC)
				return;
			let lines = infoToLines(out.infos, t, msgID);
			if (lines)
				trafficStream.write(lines + '\n');
		});
		++msgID;
	});

(async () => {
	await sim.init();

	playback.start();
})();
