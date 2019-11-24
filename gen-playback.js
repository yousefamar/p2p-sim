const EventEmitter = require('events');

class Avatar {
	static _id = 0;

	constructor(scene, x, y, wx, wy, speed = 5, updateInterval = 500) {
		this.id = Avatar._id++;
		this.scene = scene;
		this.x = x || Math.random() * scene.width;
		this.y = y || Math.random() * scene.height;
		wx = wx || Math.random() * scene.width;
		wy = wy || Math.random() * scene.height;
		this.setWaypoint(wx, wy);
		this.speed = speed;
		this.updateInterval = updateInterval;
	}

	setWaypoint(wx, wy) {
		this.wx = wx;
		this.wy = wy;
		let dx = wx - this.x;
		let dy = wy - this.y;
		let m = Math.sqrt(dx * dx + dy * dy);
		dx /= m;
		dy /= m;
		this.dx = this.speed * dx;
		this.dy = this.speed * dy;
	}

	isNearWaypoint(dist) {
		let dx = wx - this.x;
		if (Math.abs(dx) > dist)
			return false;
		let dy = wy - this.y;
		if (Math.abs(dy) > dist)
			return false;
		let m = Math.sqrt(dx * dx + dy * dy);
		if (m > dist)
			return false;
		return true;
	}

	// NOTE: If simulation timestep is too large, an avatar may overshoot waypoint forever
	// NOTE: If speed is too large, avatar will hang forever
	tick(deltaTime = 1) {
		let dx, dy, m;
		while (true) {
			dx = this.wx - this.x;
			dy = this.wy - this.y;
			m = Math.sqrt(dx * dx + dy * dy);
			if (m > deltaTime * this.speed)
				break;
			this.x = this.wx;
			this.y = this.wy;
			this.setWaypoint(Math.random() * this.scene.width, Math.random() * this.scene.height);
		}
		this.x += this.speed * dx / m;
		this.y += this.speed * dy / m;
	}
}


module.exports = class GenPlayback extends EventEmitter {
	static aoiRadius = 100;

	constructor(width = 2000, height = 2000) {
		super();
		this.players  = [];
		this.width    = width;
		this.height   = height;
		this.ts       = 0;
		this.isPaused = false;
		this.scene    = { width, height };
	}

	spawnPlayer() {
		let player = new Avatar(this.scene);
		this.players.push(player);
		this.emit('spawn', player);
	}

	movePlayer(player) {
		if (Math.random() < 0.01)
			player.dir = Math.random() * 2 * Math.PI;

		player.x += Math.cos(player.dir)
		player.y += Math.sin(player.dir)

		let collision = false;

		if (player.x > this.width) {
			player.x = 2 * this.width - player.x;
			collision = true;
		} else if (player.x < 0) {
			player.x = -player.x;
			collision = true;
		}
		if (player.y > this.height) {
			player.y = 2 * this.height - player.y;
			collision = true;
		} else if (player.y < 0) {
			player.y = -player.y;
			collision = true;
		}

		if (collision)
			player.dir = Math.PI - player.dir;
	}

	start() {
		while(!this.isPaused) {
			if (!(this.ts % 10))
				this.spawnPlayer();
			for (let player of this.players) {
				player.tick();
				//this.movePlayer(player);
			}
			for (let player of this.players) {
				this.emit('update', player.id, player.x, player.y);
			}
			this.emit('time', this.ts);
			if (!(this.ts % this.updateInterval)) {
				for (let player of this.players) {
					this.emit('aoicast', this.ts, player.id, 40, GenPlayback.aoiRadius);
				}
			}
			++this.ts;
		}
	}

	pause() {
		this.isPaused = true;
	}

	resume() {
		this.isPaused = false;
		this.start();
	}

	processPacket(packet) {
		let player;
		switch (packet.type) {

				////////////////////////
				// Stuff to broadcast //
				////////////////////////

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
