const fs = require('fs');
const assert = require('assert');
const seedrandom = require('seedrandom');
const Simulation = require('./simulation.js');
const topologies = require('./topologies.js');

const type = process.argv[2];
if (!type) {
	console.error('Missing type argument');
	process.exit(1);
}

const dir = './share-out/data/';
let maxDegreeStream = null;
let maxActiveDegreeStream = null;

const fileStreams = {};

let checkStatsConsistency = stats => {
	for (let stat of stats) {
		assert(stat.updates.received.position + stat.updates.received.nonPosition === stat.updates.received.total)
	}
};

let strToProp = (obj, str) => {
	// TODO: Error checking
	str = str.split('.');
	while (str.length) {
		obj = obj[str.shift()];
	}
	return obj;
};

let logSummary = (stats, prop) => {
	if (!stats.length)
		return;
	let max  = -Infinity;
	let min  = Infinity;
	let sum  = 0;
	let mean;

	let props = stats.map(s => strToProp(s, prop));
	props.forEach(p => {
		max  = Math.max(p, max);
		min  = Math.min(p, min);
		sum += p;
	});
	mean = sum / props.length;

	let tabs = '\t';
	if (prop.length < 23)
		tabs += '\t';

	console.log(prop + tabs, 'min:', min, 'mean:', mean, 'max:', max, 'sum:', sum);
};

let zeroArrayUndefineds = a => {
	for (let i = 0, len = a.length; i < len; ++i)
		a[i] = a[i] || 0;
};

let saveTable = (stats, prop, topology, workload) => {
	if (!(prop in fileStreams)) {
		fileStreams[prop] = fs.openSync(dir + 'stats/' + prop + '.csv', 'w');
		fs.writeSync(fileStreams[prop], `sample,topology,workload\n`);
	}
	let fileStream = fileStreams[prop];
	let props = stats.map(s => strToProp(s, prop));
	props.forEach(p => {
		fs.writeSync(fileStream, `${p},${topology.name},${workload[0]}\n`);
	});
};

let saveDistribution = (stats, prop, topology, workload) => {
	if (!(prop in fileStreams)) {
		fileStreams[prop] = fs.openSync(dir + 'stats/' + prop + '.csv', 'w');
		fs.writeSync(fileStreams[prop], `sample,topology,workload\n`);
	}
	let fileStream = fileStreams[prop];
	let props = stats.map(s => strToProp(s, prop));
	props.forEach(p => {
		fs.writeSync(fileStream, `${p},${topology.name},${workload[0]}\n`);
	});
};

let saveLineplot = (stats, prop, topology, workload, variableName='playerCount', variable) => {
	let filename = prop + '-' + variableName;
	if (!(filename in fileStreams)) {
		fileStreams[filename] = fs.openSync(dir + 'stats/' + filename + '.csv', 'w');
		fs.writeSync(fileStreams[filename], `sample,variable,topology,workload\n`);
	}
	let fileStream = fileStreams[filename];
	let props = stats.map(s => strToProp(s, prop));
	props.forEach(p => {
		if (variableName === 'playerCount') {
			for (let i = 0, len = p.length; i < len; ++i)
				fs.writeSync(fileStream, `${p[i] || 0},${i},${topology.name},${workload[0]}\n`);
		} else {
			fs.writeSync(fileStream, `${p},${variable},${topology.name},${workload[0]}\n`);
		}
	});
};

async function run({
	workload,
	topology,
	aoiR = 390,
	topoRecomputeInterval = 1000,
	maxHops = 3,
	lossRatio = 0.0,
	chanceOfEvil = 0.0,
	mode = 'plain',
	churn
} = {}) {
	if (workload == null)
		throw 'Undefined workload';
	if (topology == null)
		throw 'Undefined topology';

	const sim = new Simulation({
		lossRatio,
		chanceOfEvil,
		aoiRadius: aoiR,
		maxHops,
		topology,
		topoRecomputeInterval
	});

	if (mode === 'plain') {
		if (maxDegreeStream == null) {
			maxDegreeStream = fs.openSync(dir + 'max-degree.csv', 'w');
			fs.writeSync(maxDegreeStream, `variable,sample,topology,workload\n`);
		}
		if (maxActiveDegreeStream == null) {
			maxActiveDegreeStream = fs.openSync(dir + 'max-active-degree.csv', 'w');
			fs.writeSync(maxActiveDegreeStream, `variable,sample,topology,workload\n`);
		}
		sim.on('maxDegree', (peerCount, maxDegree) => {
			fs.writeSync(maxDegreeStream, `${peerCount},${maxDegree},${topology.name},${workload[0]}\n`);
		}).on('maxActiveDegree', (peerCount, maxActiveDegree) => {
			fs.writeSync(maxActiveDegreeStream, `${peerCount},${maxActiveDegree},${topology.name},${workload[0]}\n`);
		});
	}

	await sim.init();

	let args;

	if (mode === 'churn') {
		// Range between 1m and 1h
		let interval = (churn * ((1 * 60 * 60 * 1000) - 20 * 60 * 1000)) + 20 * 60 * 1000;
		args = {
			spawnIntervalMS: interval,
			despawnIntervalMS: interval,
			startCount: 10
		};
	}

	for await (const line of workload[1](args)) {
		let [ event, ts, id, bytes, aoiRadius, ...args ] = line;
		ts = +ts;
		bytes = +bytes;
		aoiRadius = +aoiRadius;

		sim.broadcastTimestamp(ts);

		let x, y, peer;

		if (ts >= sim.nextTopoRecomputeTS)
			sim.recomputeTopology(topology, ts);

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
					sim.recomputeTopology(topology, ts);
				} else {
					sim.updatePos(peer, x, y, ts);
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
				sim.recomputeTopology(topology, ts);
				break;

			default:
				throw 'Unknown event in trace: ' + event;
		}

		sim.despawnZombies(ts);
	}
	await sim.end();

/*
	logSummary(sim.stats, 'updates.emitted.total');
	logSummary(sim.stats, 'updates.emitted.position');
	logSummary(sim.stats, 'updates.received.total');
	logSummary(sim.stats, 'updates.received.bytes');
	logSummary(sim.stats, 'updates.received.position');
*/

	checkStatsConsistency(sim.stats);

	switch (mode) {
		case 'plain':
			saveDistribution(sim.stats, 'meanUpload', topology, workload);
			saveDistribution(sim.stats, 'meanDownload', topology, workload);

			saveDistribution(sim.stats, 'meanMissingRatio', topology, workload);
			saveDistribution(sim.stats, 'meanExtraRatio', topology, workload);

			saveDistribution(sim.stats, 'meanMeanDrift', topology, workload);

			// churn ones (no churn)
			saveDistribution(sim.stats, 'updates.sent.total', topology, workload);
			saveDistribution(sim.stats, 'updates.dropped.dueToCooldown', topology, workload);
			saveDistribution(sim.stats, 'updates.dropped.dueToLoss', topology, workload);
			saveDistribution(sim.stats, 'updates.attemptedToSend', topology, workload);

			if (workload[0] === 'synth-rwp') {
				saveLineplot(sim.stats, 'meanMeanDrifts', topology, workload);
				saveLineplot(sim.stats, 'meanUploads', topology, workload);
				saveLineplot(sim.stats, 'meanDownloads', topology, workload);
			}
			break;

		case 'churn':
			saveLineplot(sim.stats, 'meanMeanDrift', topology, workload, 'churn', churn);
			saveLineplot(sim.stats, 'meanMissingRatio', topology, workload, 'churn', churn);
			saveLineplot(sim.stats, 'meanExtraRatio', topology, workload, 'churn', churn);
			saveLineplot(sim.stats, 'updates.sent.total', topology, workload, 'churn', churn);
			saveLineplot(sim.stats, 'updates.dropped.dueToCooldown', topology, workload, 'churn', churn);
			saveLineplot(sim.stats, 'updates.attemptedToSend', topology, workload, 'churn', churn);
			break;

		case 'loss':
			saveLineplot(sim.stats, 'meanMeanDrift', topology, workload, 'lossRatio', lossRatio);
			saveLineplot(sim.stats, 'meanMissingRatio', topology, workload, 'lossRatio', lossRatio);
			saveLineplot(sim.stats, 'meanExtraRatio', topology, workload, 'lossRatio', lossRatio);
			saveLineplot(sim.stats, 'updates.sent.total', topology, workload, 'lossRatio', lossRatio);
			saveLineplot(sim.stats, 'updates.dropped.dueToLoss', topology, workload, 'lossRatio', lossRatio);
			break;

		case 'evil':
			saveLineplot(sim.stats, 'updates.ignored.corrupt', topology, workload, 'chanceOfEvil', chanceOfEvil);
			saveLineplot(sim.stats, 'updates.accepted.corrupt', topology, workload, 'chanceOfEvil', chanceOfEvil);
			saveLineplot(sim.stats, 'updates.accepted.corruptMag', topology, workload, 'chanceOfEvil', chanceOfEvil);
			break;

		default:
			break;
	}

	logSummary(sim.stats, 'updates.sent.total');
	logSummary(sim.stats, 'updates.sent.bytes');
	logSummary(sim.stats, 'updates.dropped.dueToDespawn');
	logSummary(sim.stats, 'updates.dropped.dueToUnknownRoot');
	logSummary(sim.stats, 'updates.received.total');
	logSummary(sim.stats, 'updates.received.bytes');
	logSummary(sim.stats, 'meanMeanDrift');
	logSummary(sim.stats, 'logCount');
	logSummary(sim.stats, 'activationQueueSize');
	console.log('_______________________________________________________________________________\n');
}

const aoiR         = 390;
const maxHops      = 3;

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
	'synth-rwp': require('./generators/synth-rwp.js'),
	'trace-static':  require('./generators/trace-static.js'),
	'trace-dynamic': require('./generators/trace-dynamic.js')
};


(async () => {
	for (const workload of Object.entries(workloads)) {
		for (const topo of topos) {
			let lossRatio    = 0.0;
			let chanceOfEvil = 0.0;

			if (type === '1') {
				topo.clearstate(); // TODO: No longer neccessary
				// Reseed PRNG for consistent results
				seedrandom('yousef', { global: true });
				console.log(`Playing back with parameters:
		Workload:			${workload[0]}
		AOI radius:			${aoiR}
		Topology:			${topo.name}
		Topology compute interval:	10000 ms
		Max hops:			${maxHops}
		Loss ratio:			${lossRatio}
		Chance of evil:			${chanceOfEvil}`);
				try {
					await run({
						workload: workload,
						topology: topo,
						// TODO: Dynamic AOI?
						aoiR: aoiR,
						topoRecomputeInterval: 10000,
						maxHops: maxHops,
						lossRatio: lossRatio,
						chanceOfEvil: chanceOfEvil,
						mode: 'plain'
					});
				} catch (e) {
					console.error(e);
					return;
				}

				if (workload[0] === 'synth-rwp') {
					for (let churn = 0.0; churn <= 1.0; churn += 0.1) {
						churn = parseFloat(churn.toFixed(1));
						topo.clearstate(); // TODO: No longer neccessary
						// Reseed PRNG for consistent results
						seedrandom('yousef', { global: true });
						console.log(`Playing back with parameters:
		Workload:			${workload[0]}
		AOI radius:			${aoiR}
		Topology:			${topo.name}
		Topology compute interval:	10000 ms
		Max hops:			${maxHops}
		Loss ratio:			${lossRatio}
		Chance of evil:			${chanceOfEvil}
		Churn:				${churn}`);
						try {
							await run({
								workload: workload,
								topology: topo,
								// TODO: Dynamic AOI?
								aoiR: aoiR,
								topoRecomputeInterval: 10000,
								maxHops: maxHops,
								lossRatio: lossRatio,
								chanceOfEvil: chanceOfEvil,
								mode: 'churn',
								churn: churn
							});
						} catch (e) {
							console.error(e);
							return;
						}
					}
				}
			} else if (type === '2') {
				for (chanceOfEvil = 0.0; chanceOfEvil <= 1.0; chanceOfEvil += 0.1) {
					chanceOfEvil = parseFloat(chanceOfEvil.toFixed(1));
					topo.clearstate(); // TODO: No longer neccessary
					// Reseed PRNG for consistent results
					seedrandom('yousef', { global: true });
					console.log(`Playing back with parameters:
		Workload:			${workload[0]}
		AOI radius:			${aoiR}
		Topology:			${topo.name}
		Topology compute interval:	10000 ms
		Max hops:			${maxHops}
		Loss ratio:			${lossRatio}
		Chance of evil:			${chanceOfEvil}`);
					try {
						await run({
							workload: workload,
							topology: topo,
							// TODO: Dynamic AOI?
							aoiR: aoiR,
							topoRecomputeInterval: 10000,
							maxHops: maxHops,
							lossRatio: lossRatio,
							chanceOfEvil: chanceOfEvil,
							mode: 'evil'
						});
					} catch (e) {
						console.error(e);
						return;
					}
				}
				chanceOfEvil = 0.0;
				for (lossRatio = 0.0; lossRatio <= 1.0; lossRatio += 0.1) {
					lossRatio = parseFloat(lossRatio.toFixed(1));
					topo.clearstate(); // TODO: No longer neccessary
					// Reseed PRNG for consistent results
					seedrandom('yousef', { global: true });
					console.log(`Playing back with parameters:
		Workload:			${workload[0]}
		AOI radius:			${aoiR}
		Topology:			${topo.name}
		Topology compute interval:	10000 ms
		Max hops:			${maxHops}
		Loss ratio:			${lossRatio}
		Chance of evil:			${chanceOfEvil}`);
					try {
						await run({
							workload: workload,
							topology: topo,
							// TODO: Dynamic AOI?
							aoiR: aoiR,
							topoRecomputeInterval: 10000,
							maxHops: maxHops,
							lossRatio: lossRatio,
							chanceOfEvil: chanceOfEvil,
							mode: 'loss'
						});
					} catch (e) {
						console.error(e);
						return;
					}
				}
			}
		}
	}
})();
