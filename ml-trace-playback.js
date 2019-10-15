const fs = require('fs');
const EventEmitter = require('events');
const split = require('split');

module.exports = class MLTracePlayback extends EventEmitter {
	static aoiRadius = 390;

	nextMsg  = null;
	nextStat = null;
	finishedReadingMsgs  = false;
	finishedReadingStats = false;

	constructor(msgsPath, statPath) {
		super();

		this.msgsStream = fs.createReadStream(msgsPath).pipe(split());
		this.statStream = fs.createReadStream(statPath).pipe(split());

		this.msgsStream.pause();
		this.statStream.pause();

		//this.droneList = droneListPath ? fs.readFileSync(droneListPath, { encoding: 'utf-8' }).trim().split('\n').map(l => l.split(' ')[1]) : [];

		this.msgsStream.on('data', line => {
			const msg = this.parseMsg(line);
			if (this.nextMsg) {
				this.processPacket(this.nextMsg);
				this.nextMsg = null;
			}
			if (!this.finishedReadingStats && (!this.nextStat || !msg || msg.ts > this.nextStat.ts)) {
				this.nextMsg = msg;
				this.msgsStream.pause();
				this.statStream.resume();
				return;
			}
			msg && this.processPacket(msg);
		});

		this.msgsStream.on('end', () => {
			this.finishedReadingMsgs = true;
			if (this.finishedReadingStats) {
				this.emit('end');
				return;
			}
			this.statStream.resume();
		});

		this.statStream.on('data', line => {
			const stat = this.parseStat(line);
			if (this.nextStat) {
				this.processPacket(this.nextStat);
				this.nextStat = null;
			}
			if (!this.finishedReadingMsgs && (!this.nextMsg || !stat || stat.ts > this.nextMsg.ts)) {
				this.nextStat = stat;
				this.statStream.pause();
				this.msgsStream.resume();
				return;
			}
			stat && !this.processPacket(stat);
		});

		this.statStream.on('end', () => {
			this.finishedReadingStats = true;
			if (this.finishedReadingMsgs) {
				this.emit('end');
				return;
			}
			this.msgsStream.resume();
		});
	}

	start() {
		this.msgsStream.resume();
	}

	pause() {
		this.msgsStream.pause();
		this.statStream.pause();
	}

	resume() {
		this.msgsStream.resume();
	}

	parseMsg(line) {
		if (!line)
			return null;
		line = line.split(' ');
		let ts = line[0];
		let type = line[1];
		let data = line.splice(2).join(' ');
		let bytes = Buffer.byteLength(data, 'utf8');
		return { ts, type, data: JSON.parse(data), bytes };
	}

	parseStat(line) {
		if (!line)
			return null;
		line = line.split(' ');
		let ts = line[0];
		let data = line.splice(1).join(' ');
		let bytes = Buffer.byteLength(data, 'utf8');
		return { ts, type: 'STAT', data: JSON.parse(data), bytes };
	}

	processPacket(packet) {
		let player;
		switch (packet.type) {

				////////////////////////
				// Stuff to broadcast //
				////////////////////////

			case 'PLAYER_LIST':
				// TODO: Technically, in client-server, the server maintains this
				packet.data.data.forEach(p => this.processPacket({
					ts: packet.ts,
					type: 'PLAYER_DATA',
					data: { m: 'qv', data: p },
					bytes: Buffer.byteLength(JSON.stringify({ m: 'qv', data: p }), 'utf8')
				}));
				break;
			case 'PLAYER_SPAWN':
			case 'PLAYER_DATA':
				this.emit('spawn', (player = {
					id: packet.data.data.rid,
					x: packet.data.data.pos.x,
					y: packet.data.data.pos.y
				}));
				//this.emit('broadcast', packet.ts, player.id, packet.bytes);
				this.emit('aoicast', packet.ts, player.id, packet.bytes, MLTracePlayback.aoiRadius);
				this.emit('time', +packet.ts);
				break;
			case 'PLAYER_DESPAWN':
				//this.emit('broadcast', packet.ts, packet.data.data.rid, packet.bytes);
				this.emit('aoicast', packet.ts, packet.data.data.rid, packet.bytes, MLTracePlayback.aoiRadius);
				this.emit('despawn', packet.data.data.rid);
				this.emit('time', +packet.ts);
				break;

				//////////////////////
				// Stuff to AOIcast //
				//////////////////////

			case 'STAT':
				this.emit('update', packet.data.rid, packet.data.pos.x, packet.data.pos.y)
				this.emit('aoicast', packet.ts, packet.data.rid, packet.bytes, MLTracePlayback.aoiRadius);
				this.emit('time', +packet.ts);
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
				this.emit('aoicast', packet.ts, packet.data.data.rid, packet.bytes, MLTracePlayback.aoiRadius);
				this.emit('time', +packet.ts);
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
	}
}
