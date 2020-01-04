const fs = require('fs');
const seedrandom = require('seedrandom');
const Simulation = require('./simulation.js');
const topologies = require('./topologies.js');

//const corruptionStream = fs.openSync(dir + 'corruption.csv', 'w');

async function run({
	workload,
	topology,
	aoiR = 390,
	topoRecomputeInterval = 1000,
	chanceOfEvil = 0.0,
	maxHops = 3
} = {}) {
	if (workload == null)
		throw 'Undefined workload';
	if (topology == null)
		throw 'Undefined topology';

	const sim = new Simulation({ chanceOfEvil, aoiRadius: aoiR, maxHops: maxHops });

	let nextTopoRecomputeTS = 0;
	let recomputeTopology = (t, ts) => {
		t.fw = t.recompute(sim.world, sim);
		nextTopoRecomputeTS = ts + topoRecomputeInterval;
		//sim.rewire();
		t.preconnect(sim.world, sim);
	};

	await sim.init();

	for await (const line of workload()) {
		let [ event, ts, id, bytes, aoiRadius, ...args ] = line;
		ts = +ts;
		bytes = +bytes;
		aoiRadius = +aoiRadius;

		sim.broadcastTimestamp(ts);

		let x, y, peer;

		if (ts >= nextTopoRecomputeTS)
			recomputeTopology(topology, ts);

		switch (event) {

			case 's': // Spawn
			case 'u': // Update
				[ x, y ] = args;
				x = +x;
				y = +y;
				peer = sim.getPeer(id);
				if (peer.length < 1) {
					sim.spawn({ ts, id, x, y });
					peer = sim.getPeer(id);
					recomputeTopology(topology, ts);
				} else {
					sim.updatePos(peer, x, y);
				}
				sim.aoicast(peer, ts, id, bytes, aoiRadius, x, y);
				break;

			// Aoicast
			case 'a':
				peer = sim.getPeer(id);
				if (peer.length < 1) {
					//console.error('\nPlayer that never spawned aoicasted', id);
				} else {
					sim.aoicast(peer, ts, id, bytes, aoiRadius);
				}
				break;

			// Despawn
			case 'd':
				peer = sim.getPeer(id);
				if (peer.length < 1)
					break;
				sim.aoicast(peer, ts, id, bytes, aoiRadius);
				sim.despawn(peer);
				recomputeTopology(topology, ts);
				break;

			default:
				throw 'Unknown event in trace: ' + event;
		}
	}
	sim.end();
}

const aoiR = 390;
const maxHops = 3;

let topos = Object.entries({
	'ClientServer': {},
	'Complete': {},
	// FIXME: AOI radius is hardcoded in here
	'AOI': { aoiRadius: aoiR },
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

let workloads = {
	'trace-static':  require('./generators/trace-static.js'),
	'trace-dynamic': require('./generators/trace-dynamic.js')
};

(async () => {
	for (const workload of Object.entries(workloads)) {
		for (const topo of topos) {
			topo.clearstate();
			// Reseed PRNG for consistent results
			seedrandom('yousef', { global: true });
			console.log(`Playing back with parameters:
	Workload:			${workload[0]}
	AOI radius:			${aoiR}
	Topology:			${topo.name}
	Topology compute interval:	10000 ms
	Max hops:			${maxHops}
	Chance of evil:			0.5`);
			try {
				await run({
					workload: workload[1],
					topology: topo,
					// TODO: Dynamic AOI?
					aoiR: aoiR,
					topoRecomputeInterval: 10000,
					chanceOfEvil: 0.5,
					maxHops: maxHops
				});
			} catch (e) {
				console.error(e);
				return;
			}
		}
	}
})();
