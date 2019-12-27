const fs = require('fs');
const cliProgress = require('cli-progress');
const Simulation = require('./simulation.js');
const MLTracePlayback = require('./ml-trace-playback.js');
require('seedrandom')('yousef', { global: true });

const dir = '/home/amar/share/mlrecs/';
const droneList = new Set(fs.readFileSync(dir + 'droneList.txt', { encoding: 'utf-8' }).trim().split('\n').map(l => l.split(' ')[1]));

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const startTS  = new Date(2019, 11 - 1, 11).getTime();
const endTS    = new Date(2019, 11 - 1, 18).getTime();

const topologies = require('./topologies.js');
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

const chanceOfEvil = 0.5;
const sim    = new Simulation(chanceOfEvil);
const router = require('./routers/instant.js').instance;
let msgID = 0;

const topoRecomputeInterval = 10000;
let nextTopoRecomputeTS     = startTS + topoRecomputeInterval;
let recomputeTopologies     = () => {
	topos.forEach(t => {
		t.fw = t.recompute(sim.world, sim);
	});
	nextTopoRecomputeTS += topoRecomputeInterval;
};

const corruptionStream = fs.openSync(dir + 'corruption.csv', 'w');

(async () => {
	progressBar.start(endTS - startTS, 0);

	await sim.init();

	for (let day = 11; day <= 17; ++day) {
		let playback = new MLTracePlayback(dir + '2019-11-' + day + '-starbucks-msgs.mlrec', dir + '2019-11-' + day + '-starbucks-stat.mlrec');

		playback
			.once('time', ts => {
				recomputeTopologies();
			})
			.on('time', ts => {
				if (ts >= nextTopoRecomputeTS)
					recomputeTopologies();

				progressBar.update(ts - startTS);
			})
			.on('spawn', player => {
				if (droneList.has(player.id))
					return;
				let peer = sim.getPeer(player.id);
				if (peer.length > 0) {
					//console.error('Player that already spawned spawned again', player.id);
					sim.updatePos(peer, player.x, player.y);
				} else {
					sim.spawn(player);
					recomputeTopologies();
				}
			})
			.on('despawn', (id, ts) => {
				if (droneList.has(id))
					return;
				let peer = sim.getPeer(id);
				if (peer.length < 1) {
					//console.error('Player that never spawned despawned', id);
					return;
				}
				sim.despawn(peer);
				recomputeTopologies();
			})
			.on('update', (id, x, y, ts) => {
				if (droneList.has(id))
					return;
				let peer = sim.getPeer(id);
				if (peer.length < 1) {
					//console.error('Player that never spawned got update', id);
					sim.spawn({ id, x, y });
					recomputeTopologies();
					return;
				}
				sim.updatePos(peer, x, y);
				//fs.writeSync(mobilityStream, `${ts},${id},${x},${y}\n`);
			})
			.on('aoicast', (ts, id, bytes, aoiRadius) => {
				let peer = sim.getPeer(id);
				if (peer.length < 1) {
					//console.error('\nPlayer that never spawned aoicasted', id);
					return;
				}
				for (let t of topos) {
					let out = router.aoicast(sim, t, ts, peer, bytes, aoiRadius);
					let { bytesClean, bytesCorrupt } = out;
					let bytesTotal = bytesCorrupt + bytesClean;
					if (bytesTotal)
						fs.writeSync(corruptionStream, `${ts},${bytesClean},${bytesCorrupt},${t.name}\n`);
				}
				++msgID;
			});

		playback.start();
		await new Promise(resolve => playback.on('end', resolve));
	}
	progressBar.stop();
})();
