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

module.exports = {
	Peer,
	Simulation
};
