const fs = require('fs');
const split = require('split');

const topologies = require('./topologies.js');

const aoiRadius = 21;

const msgsPath = process.argv[2];
const statPath = process.argv[3];
//const droneListPath = process.argv[4];
const topologyName = process.argv[4];

if (!msgsPath || !statPath | !topologyName)
	throw new Error('Undefined parameters');

const msgsStream = fs.createReadStream(msgsPath).pipe(split());
const statStream = fs.createReadStream(statPath).pipe(split());

msgsStream.pause();
statStream.pause();

//const droneList = droneListPath ? fs.readFileSync(droneListPath, { encoding: 'utf-8' }).trim().split('\n').map(l => l.split(' ')[1]) : [];

const topology = new topologies[topologyName]();

let nextMsg  = null;
let nextStat = null;
let finishedReadingMsgs  = false;
let finishedReadingStats = false;

let parseMsg = line => {
	if (!line)
		return null;
	line = line.split(' ');
	let ts = line[0];
	let type = line[1];
	let data = line.splice(2).join(' ');
	let bytes = Buffer.byteLength(data, 'utf8');
	return { ts, type, data: JSON.parse(data), bytes };
};

let parseStat = line => {
	if (!line)
		return null;
	line = line.split(' ');
	let ts = line[0];
	let data = line.splice(1).join(' ');
	let bytes = Buffer.byteLength(data, 'utf8');
	return { ts, type: 'STAT', data: JSON.parse(data), bytes };
};

let processPacket = packet => {
	let player;
	switch (packet.type) {

		////////////////////////
		// Stuff to broadcast //
		////////////////////////

		case 'PLAYER_LIST':
			// TODO: Technically, in client-server, the server maintains this
			packet.data.data.forEach(p => processPacket({
				ts: packet.ts,
				type: 'PLAYER_DATA',
				data: { m: 'qv', data: p },
				bytes: Buffer.byteLength(JSON.stringify({ m: 'qv', data: p }), 'utf8')
			}));
			break;
		case 'PLAYER_SPAWN':
		case 'PLAYER_DATA':
			topology.spawn(player = {
				id: packet.data.data.rid,
				x: packet.data.data.pos.x,
				y: packet.data.data.pos.y
			});
			topology.broadcast(packet.ts, player.id, packet.bytes);
			break;
		case 'PLAYER_DESPAWN':
			player = topology.players[packet.data.data.rid];
			if (!player) {
				console.error('Player that never spawned despawned', packet.data.data.rid);
				break;
			}
			topology.broadcast(packet.ts, packet.data.data.rid, packet.bytes);
			topology.despawn(packet.data.data.rid);
			break;

		//////////////////////
		// Stuff to AOIcast //
		//////////////////////

		case 'STAT':
			player = topology.players[packet.data.rid];
			if (!player) {
				console.error('Player that never spawned got stat', packet.data.rid);
				break;
			}
			topology.update(packet.data.rid, packet.data.pos.x, packet.data.pos.y)
			topology.aoicast(packet.ts, player.id, packet.bytes, aoiRadius);
			break;
		case 'SPEECH':
		case 'CHANGE_ATTACHMENT':
		case 'CHANGE_NAME':
		case 'EQUIPMENT_ACTION':
		case 'INTERACTING_ACTIVITY':
		case 'TELEPORT':
		case 'HOLDABLE_INTERACTION':
		case 'MOTION':
		case 'PLAYER_DEATH':
		case 'BOOST_STARTED':
		case 'PASTE':
		case 'DUNNO_ATT':
		case 'SNAPSHOT_TAKEN':
		case 'THROW_ATTACHMENT':
		case 'ADDED_LINES':
		case 'INSTRUMENT_NOTE':
		case 'SPARKLE_LINE':
			player = topology.players[packet.data.data.rid];
			if (!player) {
				console.error('Player that never spawned got', packet.type, packet.data.data.rid);
				break;
			}
			topology.aoicast(packet.ts, player.id, packet.bytes, aoiRadius);
			break;

		/////////////////////
		// Stuff to ignore //
		/////////////////////

		case 'OWN_INFO':
			break;
		default:
			console.log('Unkown packet type:', packet.type);
			break;
	}
};

msgsStream.on('data', line => {
	const msg = parseMsg(line);
	if (nextMsg) {
		processPacket(nextMsg);
		nextMsg = null;
	}
	if (!finishedReadingStats && (!nextStat || !msg || msg.ts > nextStat.ts)) {
		nextMsg = msg;
		msgsStream.pause();
		statStream.resume();
		return;
	}
	msg && processPacket(msg);
});

msgsStream.on('end', () => {
	finishedReadingMsgs = true;
	if (finishedReadingStats) {
		//this.emit('end');
		return;
	}
	statStream.resume();
});

statStream.on('data', line => {
	const stat = parseStat(line);
	if (nextStat) {
		processPacket(nextStat);
		nextStat = null;
	}
	if (!finishedReadingMsgs && (!nextMsg || !stat || stat.ts > nextMsg.ts)) {
		nextStat = stat;
		statStream.pause();
		msgsStream.resume();
		return;
	}
	stat && !processPacket(stat);
});

statStream.on('end', () => {
	finishedReadingStats = true;
	if (finishedReadingMsgs) {
		//this.emit('end');
		return;
	}
	msgsStream.resume();
});

msgsStream.resume();
