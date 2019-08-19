const fs = require('fs');
const EventEmitter = require('events');
const split = require('split');

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = class TracePlayback extends EventEmitter {
	playbackBufferSize = 1000;
	tickTimeMs = 100;

	constructor(msgsPath, statPath, config = {}) {
		if (!msgsPath || !statPath)
			throw new Error('Undefined parameters');

		super();

		this.msgsStream = fs.createReadStream(msgsPath).pipe(split());
		this.statStream = fs.createReadStream(statPath).pipe(split());

		this.msgsStream.pause();
		this.statStream.pause();

		this.msgsStream.on('data', line => {
			const msg = this.parseMsg(line);
			if (this.nextMsg) {
				if (!this.processPacket(this.nextMsg)) {
					this.nextMsg = msg;
					this.msgsStream.pause();
					return;
				}
				this.nextMsg = null;
			}
			if (!this.finishedReadingStats && (!this.nextStat || msg.ts > this.nextStat.ts)) {
				this.nextMsg = msg;
				this.msgsStream.pause();
				this.statStream.resume();
				return;
			}
			if (msg && !this.processPacket(msg))
				this.msgsStream.pause();
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
				if (!this.processPacket(this.nextStat)) {
					this.nextStat = stat;
					this.statStream.pause();
					return;
				}
				this.nextStat = null;
			}
			if (!this.finishedReadingMsgs && (!this.nextMsg || stat.ts > this.nextMsg.ts)) {
				this.nextStat = stat;
				this.statStream.pause();
				this.msgsStream.resume();
				return;
			}
			if (stat && !this.processPacket(stat))
				this.statStream.pause();
		});

		this.statStream.on('end', () => {
			this.finishedReadingStats = true;
			if (this.finishedReadingMsgs) {
				this.emit('end');
				return;
			}
			this.msgsStream.resume();
		});

		Object.assign(this, config);

		this.nextMsg  = null;
		this.nextStat = null;
		this.playbackBuffer = [];
		this.currentTime = null;
		this.finishedReadingMsgs  = false;
		this.finishedReadingStats = false;
	}

	parseMsg(line) {
		if (!line)
			return null;
		line = line.split(' ');
		let ts = line[0];
		let type = line[1];
		let data = JSON.parse(line.splice(2).join(' '));
		return { ts, type, data };
	}

	parseStat(line) {
		if (!line)
			return null;
		line = line.split(' ');
		let ts = line[0];
		let data = JSON.parse(line.splice(1).join(' '));
		return { ts, data, isStat: true };
	}

	processPacket(packet) {
		this.playbackBuffer.push(packet);
		//console.log(packet.isStat ? 'stat' : 'msg', Math.round(packet.ts));
		return this.playbackBuffer.length < this.playbackBufferSize;
	}

	async playback() {
		this.msgsStream.resume();
		while (this.currentTime == null) {
			if (this.playbackBuffer.length < 1) {
				await sleep(1);
				continue;
			}
			this.currentTime = +this.playbackBuffer[0].ts;
		}

		while (true) {
			while (this.playbackBuffer.length < 1) {
				if (this.finishedReadingMsgs && this.finishedReadingStats)
					return;
				console.warn("We're lagging, so we paused time. Playback speed is faster than we can read the traces. Consider increasing the playback buffer size or decreasin the playback speed.");
				// TODO: Exponential backoff
				await sleep(0.1 * this.playbackBuffer.length);
			}

			if (this.playbackBuffer.length < this.playbackBufferSize) {
				if (!this.finishedReadingMsgs)
					this.msgsStream.resume();
				else if (!this.finishedReadingStats)
					this.statStream.resume();
				else
					return;
			}

			if (+this.playbackBuffer[0].ts <= this.currentTime) {
				this.emit('packet', this.playbackBuffer.shift());
				continue;
			}

			//console.log('###');
			await sleep(1);
			this.currentTime += this.tickTimeMs;
		}
	}
}

