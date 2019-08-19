class Peer {
	constructor(id, x, y) {
		this.id = id;
		this.x = x;
		this.y = y;
		this.connections = [];
		this.visited = false;
		this.activeCount = 0;
	}

	move(x, y) {
		this.x = x;
		this.y = y;
		this.connections.forEach(c => c.recomputeDistance());
	}
}

class Connection {
	static _id = 0;

	constructor(peerA, peerB) {
		this.peerA = peerA;
		this.peerB = peerB;
		this.id = Connection._id++;
		this.distance = -1;
		this.active = false;
		this.redundant = false;
	}

	activate() {
		if (!this.active) {
			++this.peerA.activeCount;
			++this.peerB.activeCount;
		}
		this.active = true;
	}

	deactivate() {
		if (this.active) {
			--this.peerA.activeCount;
			--this.peerB.activeCount;
		}
		this.active = false;
		this.redundant = false;
	}

	recomputeDistance() {
		let dx = this.peerB.x - this.peerA.x;
		let dy = this.peerB.y - this.peerA.y;
		this.distance = Math.sqrt(dx * dx + dy * dy);
		return this;
	}
}

class Simulation {
	constructor() {
		this.peers = [];
		this.peersByID = {};
		this.connections = [];
		this.activeConnections = [];
		this.minK = 1;
	}

	addPeer(peer) {
		for (let other of this.peers) {
			let connection = new Connection(peer, other).recomputeDistance();
			other.connections.push(connection);
			peer.connections.push(connection);
			this.connections.push(connection);
		}
		this.peers.push(peer);
		this.peersByID[peer.id] = peer;
	}

	removePeer(peer) {
		// TODO: Optimise
		for (let c of peer.connections) {
			let other = c.peerA === peer ? c.peerB : c.peerA;
			other.connections.splice(other.connections.indexOf(c), 1);
		}
		for (let connection of peer.connections)
			this.connections.splice(this.connections.indexOf(connection), 1);
		this.activeConnections = this.connections.filter(c => c.active);
		this.peers.splice(this.peers.indexOf(peer), 1);
		delete this.peersByID[peer.id];
	}

	crawlMST(peer, connectionQueue) {
		peer.visited = true;
		for (let c of peer.connections) {
			if (c.active || connectionQueue.indexOf(c) >= 0)
				continue;
			let other = peer === c.peerA ? c.peerB : c.peerA;
			if (other.visited)
				continue;
			connectionQueue.push(c);
		}
		if (!connectionQueue.length)
			return;
		connectionQueue.sort((a, b) => a.distance - b.distance);
		while (connectionQueue.length) {
			let c = connectionQueue.shift();
			if (c.peerA.visited && c.peerB.visited)
				continue;
			c.activate();
			this.crawlMST(c.peerA.visited ? c.peerB : c.peerA, connectionQueue);
			return;
		}
	};

	computeMST() {
		if (this.peers.length < 1)
			return;
		for (let p of this.peers)
			p.visited = false;
		for (let c of this.connections)
			c.deactivate();
		this.crawlMST(this.peers[0], []);
		for (let p of this.peers) {
			if (p.activeCount < this.minK) {
				p.connections.forEach(c => {
					if (c.peerA.activeCount < this.minK && c.peerB.activeCount < this.minK)
						c.modifiedDistace = 0.5 * c.distance;
					else
						c.modifiedDistace = c.distance;
				});
				p.connections.sort((a, b) => a.modifiedDistace - b.modifiedDistace);
				for (let c of p.connections) {
					if (c.active)
						continue;
					c.activate();
					c.redundant = true;
					if (p.activeCount >= this.minK)
						break;
				}
			}
		}
		this.activeConnections = this.connections.filter(c => c.active);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	let svg = d3.select('body')
		.append('svg:svg')

	svg.append('g').attr('id', 'lines');
	svg.append('g').attr('id', 'circles');

	var width  = window.innerWidth;
	var height = window.innerHeight;
	var radius = 32;
	var circleCount = 10;
	let bounds = [ 0, 0, 0, 0 ];


	var onresize = () => {
		width = window.innerWidth;
		height = window.innerHeight;
		svg
			.attr('width',  width)
			.attr('height', height);
	};
	window.addEventListener('resize', onresize);
	onresize();

	let simulation = new Simulation();
	let gui = new dat.GUI();
	gui.add(simulation, 'minK', 1, circleCount - 1).step(1).onChange(() => {
		simulation.computeMST();
		// TODO: Optimise
		updateUI();
	});

	var color = d3.scaleOrdinal(d3.schemeCategory10);

	function updateUI() {
		svg.attr('viewBox', bounds.join(' '));

		let line = svg.select('#lines').selectAll('line')
			.data(simulation.activeConnections, d => d.id);

		line
			.enter().append('line')
			.attr('x1', d => d.peerA.x)
			.attr('y1', d => d.peerA.y)
			.attr('x2', d => d.peerB.x)
			.attr('y2', d => d.peerB.y)

		line
			//.transition()
			.attr('x1', d => d.peerA.x)
			.attr('y1', d => d.peerA.y)
			.attr('x2', d => d.peerB.x)
			.attr('y2', d => d.peerB.y)
			.style('stroke', d => d.redundant ? 'red' : d.active ? 'black' : '#F0F0F0')
			.style('stroke-width', d => d.active ? 3 : 1);

		line.exit().remove();

		let text = svg.selectAll('text')
			.data(simulation.activeConnections);

		text.enter().append('text');

		text
			.attr('x', d => 0.5 * (d.peerA.x + d.peerB.x))
			.attr('y', d => 0.5 * (d.peerA.y + d.peerB.y))
			.style('fill', 'black')
			.text(d => Math.floor(d.distance));

		text.exit().remove();

		let circle = svg.select('#circles').selectAll('circle')
			.data(simulation.peers, d => d.id);

		circle
			.enter().append('circle')
			.attr('cx', d => d.x)
			.attr('cy', d => d.y)
			.attr('r', radius)
			.style('fill', (d, i) => color(i));

		circle
			//.transition()
			.attr('cx', d => d.x)
			.attr('cy', d => d.y);

		circle.exit().remove();
	}

	function updateBounds(x, y) {
		bounds[0] = Math.min(bounds[0], x - 100);
		bounds[1] = Math.min(bounds[1], y - 100);
		bounds[2] = Math.max(bounds[2], x - bounds[0] + 200);
		bounds[3] = Math.max(bounds[3], y - bounds[1] + 200);
	}

	const socket = io();

	socket.on('PLAYER_LIST', packet => {
		for (let player of packet.data.data) {
			if (player.rid in simulation.peersByID) {
				simulation.peersByID[player.rid].move(player.pos.x, player.pos.y);
			} else {
				let peer = new Peer(player.rid, player.pos.x, player.pos.y);
				simulation.addPeer(peer);
			}
			updateBounds(player.pos.x, player.pos.y);
		}
		simulation.computeMST();
		updateUI();
	});

	socket.on('PLAYER_SPAWN', packet => {
		let player = packet.data.data;
		if (player.rid in simulation.peersByID) {
			simulation.peersByID[player.rid].move(player.pos.x, player.pos.y);
		} else {
			let peer = new Peer(player.rid, player.pos.x, player.pos.y);
			simulation.addPeer(peer);
		}
		updateBounds(player.pos.x, player.pos.y);
		simulation.computeMST();
		updateUI();
	});

	socket.on('STAT', packet => {
		let player = packet.data;
		if (player.rid in simulation.peersByID) {
			simulation.peersByID[player.rid].move(player.pos.x, player.pos.y);
			updateBounds(player.pos.x, player.pos.y);
			simulation.computeMST();
			updateUI();
		} else {
			console.warn('A player that never spawned got a stat', packet);
		}
	});

	socket.on('PLAYER_DESPAWN', packet => {
		let player = packet.data.data;
		if (player.rid in simulation.peersByID) {
			let peer = simulation.peersByID[player.rid];
			simulation.removePeer(peer);
			simulation.computeMST();
			updateUI();
		} else {
			console.warn('A player that never spawned despawned', packet);
		}
	});

	socket.on('end', () => {
		console.log('Finished playback');
	});
});
