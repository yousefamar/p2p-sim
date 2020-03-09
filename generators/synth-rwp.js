const cliProgress = require('cli-progress');

class Avatar {
	static _id = 0;

	constructor(scene, spawnTS, updateIntervalMS, x, y, wx, wy, speed = 130) {
		this.id = Avatar._id++;
		this.scene = scene;
		this.spawnTS = spawnTS;
		this.updateIntervalMS = updateIntervalMS;
		this.nextTickTS = spawnTS + updateIntervalMS;
		this.x = x || Math.random() * scene.width;
		this.y = y || Math.random() * scene.height;
		wx = wx || Math.random() * scene.width;
		wy = wy || Math.random() * scene.height;
		this.setWaypoint(wx, wy);
		this.speed = speed / 1000; // Convert to per ms
	}

	setWaypoint(wx, wy) {
		this.wx = wx;
		this.wy = wy;
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
	tick(ts, deltaTime) {
		let shouldTick = false;
		while (this.nextTickTS <= ts) {
			shouldTick = true;
			this.nextTickTS += this.updateIntervalMS;
		}
		if (!shouldTick)
			return false;

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
		this.x += deltaTime * this.speed * dx / m;
		this.y += deltaTime * this.speed * dy / m;
		return true;
	}
}

const gcd = (...n) => n.length === 2 ? n[1] ? gcd(n[1], n[0] % n[1]) : n[0] : n.reduce((a, c) => a = gcd(a, c));

const avatars = [];

module.exports = async function* ({
	spawnIntervalMS   =       1 * 60 * 1000,
	despawnIntervalMS =       2 * 60 * 1000,
	durationMS        =      30 * 60 * 1000,
	updateIntervalMS  = 700,
	aoiRadius         = 390,
	scene             = { width: 2000, height: 2000 },
	startCount        = 0
} = {}) {
	const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
	progressBar.start(durationMS, 0);

	const step = gcd(spawnIntervalMS, despawnIntervalMS, updateIntervalMS);

	for (let i = 0; i < startCount; ++i) {
		let avatar = new Avatar(scene, 0, updateIntervalMS);
		avatars.push(avatar);
		yield [ 's', 0, avatar.id, 28 + 1 + 8 + 2 + 4 + 4 + 2, aoiRadius, avatar.x, avatar.y ];
	}

	for (let ts = 0; ts < durationMS; ts += step) {
		if (!(ts % spawnIntervalMS)) {
			let avatar = new Avatar(scene, ts, updateIntervalMS);
			avatars.push(avatar);
			yield [ 's', ts, avatar.id, 28 + 1 + 8 + 2 + 4 + 4 + 2, aoiRadius, avatar.x, avatar.y ];
		}
		for (let avatar of avatars) {
			if(avatar.tick(ts, step))
				yield [ 'u', ts, avatar.id, 28 + 1 + 8 + 2 + 4 + 4 + 2, aoiRadius, avatar.x, avatar.y ];
		}
		if (!(ts % despawnIntervalMS)) {
			let avatar = avatars.splice(Math.floor(Math.random() * avatars.length), 1);
			if (avatars.length)
				yield [ 'd', ts, avatar.id, 28 + 1 + 8 + 2 + 2, aoiRadius ];
		}
		progressBar.update(ts);
	}

	progressBar.stop();
	console.log();
};
