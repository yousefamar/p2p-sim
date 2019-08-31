const Delaunator = require('delaunator');
const sim = require('./simulation.js');

class Topology {
	players = {};

	spawn(player) {
		this.players[player.id] = player;
	}

	update(id, x, y) {
		this.players[id].x = x;
		this.players[id].y = y;
	}

	despawn(id) {
		delete this.players[id];
	}

	aoicast = (() => {
		let dist = (a, b) => {
			let dx = b.x - a.x;
			let dy = b.y - a.y;
			return Math.sqrt(dx * dx + dy * dy);
		};

		return (ts, from, bytes, aoiRadius) => {
			from = this.players[from];
			let tos = Object.values(this.players).filter(to => to !== from && dist(to, from) <= aoiRadius);
			this.route(ts, from, tos, bytes);
		};
	})();

	broadcast(ts, from, bytes) {
		from = this.players[from];
		let tos = Object.values(this.players).filter(to => to !== from);
		this.route(ts, from, tos, bytes);
	};

	unicast(ts, from, to, bytes) {
		this.route(ts, this.players[from], [ this.players[to] ], bytes);
	}

	route(ts, from, tos, bytes) {
		throw new Error('Unimplemented');
	}
}

class ClientServer extends Topology {
	route(ts, from, tos, bytes) {
		// Everything reaches dest in 2 hops via server
		let playerCount = Object.keys(this.players).length;
	 	//for (let to of tos) {
		//	console.log([ts, from.id, 0, bytes, playerCount, playerCount, this.constructor.name].join(','));
		//	console.log([ts, 0, to.id, bytes, playerCount, playerCount, this.constructor.name].join(','));
		//}
		console.log([ts, bytes + tos.length * bytes, playerCount, playerCount, 2, this.constructor.name].join(','));
	}
}

class Complete extends Topology {
	route(ts, from, tos, bytes) {
		// Everything reaches dest in 1 hop
		let playerCount = Object.keys(this.players).length;
		//for (let to of tos)
		//	console.log([ts, from.id, to.id, bytes, Object.keys(this.players).length, this.constructor.name].join(','));
		console.log([ts, tos.length * bytes, playerCount, 0.5 * playerCount * (playerCount - 1), 1, this.constructor.name].join(','));
	}
}

class AOIComplete extends Topology {
}

class Delaunay extends Topology {
	constructor() {
		super();
		this.simulation = new sim.Simulation();
		let getX = peer => peer.x;
		let getY = peer => peer.y;
		let connect = (a, b) => {
			for (let con of a.connections) {
				let other = con.peerA === a ? con.peerB : con.peerA;
				if (other !== b)
					continue;
				con.activate();
				return true;
			}
			return false;
		};
		this.simulation.computeMST = function() {
			for (let c of this.connections)
				c.deactivate();
			let triangles = Delaunator.from(this.peers, getX, getY).triangles;
			for (let i = 0; i < triangles.length; i += 3) {
				let a = this.peers[triangles[i]];
				let b = this.peers[triangles[i + 1]];
				let c = this.peers[triangles[i + 2]];
				if (!(connect(a, b) && connect(b, c) && connect(c, a)))
					throw new Error('Failed to wire up the Delauney network somehow. This should never happen.');
			}
			this.activeConnections = this.connections.filter(c => c.active);
		};
	}

	spawn(player) {
		super.spawn(player);
		if (player.id in this.simulation.peersByID) {
			let peer = this.simulation.peersByID[player.id];
			peer.x = player.x;
			peer.y = player.y;
		} else {
			let peer = new sim.Peer(player.id, player.x, player.y);
			this.simulation.addPeer(peer);
		}
		this.simulation.computeMST();
	}

	update(id, x, y) {
		super.update(id, x, y);
		let peer = this.simulation.peersByID[id];
		peer.x = x;
		peer.y = y;
		this.simulation.computeMST();
	}

	despawn(id) {
		super.despawn(id);
		this.simulation.removePeer(this.simulation.peersByID[id]);
		this.simulation.computeMST();
	}

	route = (() => {
		let getShortestPath = (peer, target) => {
			if (peer.visited)
				return null;
			peer.visited = true;

			if (peer === target)
				return [ peer ];

			// Find all paths
			let paths = [];
			for (let c of peer.connections) {
				let other = c.peerA === peer ? c.peerB : c.peerA;
				let path = getShortestPath(other, target);
				if (path) {
					path.unshift(peer);
					paths.push(path);
				}
			}

			if (paths.length < 1)
				return null;

			// Return shortest path
			return paths.sort((a, b) => a.length - b.length)[0];
		};

		return (ts, from, tos, bytes) => {
			let playerCount = Object.keys(this.players).length;
			for (let to of tos) {
				for (let p of this.simulation.peers)
					p.visited = false;

				let path = getShortestPath(this.simulation.peersByID[from.id], this.simulation.peersByID[to.id]);

				if (!path)
					throw new Error('Something went terribly wrong; the peer network is disconnected!');

				//for (var i = 0, len = path.length - 1; i < len; ++i)
				//	console.log([ts, path[i].id, path[i + 1].id, bytes, Object.keys(this.players).length, this.constructor.name].join(','));
				console.log([ts, (path.length - 1) * bytes, playerCount, this.simulation.activeConnections.length, path.length - 1, this.constructor.name].join(','));
			}
		};
	})();
}


class Ours extends Topology {
	constructor() {
		super();
		this.simulation = new sim.Simulation();
	}

	spawn(player) {
		super.spawn(player);
		if (player.id in this.simulation.peersByID) {
			this.simulation.peersByID[player.id].move(player.x, player.y);
		} else {
			let peer = new sim.Peer(player.id, player.x, player.y);
			this.simulation.addPeer(peer);
		}
		this.simulation.computeMST();
	}

	update(id, x, y) {
		super.update(id, x, y);
		this.simulation.peersByID[id].move(x, y);
		this.simulation.computeMST();
	}

	despawn(id) {
		super.despawn(id);
		this.simulation.removePeer(this.simulation.peersByID[id]);
		this.simulation.computeMST();
	}

	route = (() => {
		let getShortestPath = (peer, target) => {
			if (peer.visited)
				return null;
			peer.visited = true;

			if (peer === target)
				return [ peer ];

			// Find all paths
			let paths = [];
			for (let c of peer.connections) {
				let other = c.peerA === peer ? c.peerB : c.peerA;
				let path = getShortestPath(other, target);
				if (path) {
					path.unshift(peer);
					paths.push(path);
				}
			}

			if (paths.length < 1)
				return null;

			// Return shortest path
			return paths.sort((a, b) => a.length - b.length)[0];
		};

		return (ts, from, tos, bytes) => {
			let playerCount = Object.keys(this.players).length;
			for (let to of tos) {
				for (let p of this.simulation.peers)
					p.visited = false;

				let path = getShortestPath(this.simulation.peersByID[from.id], this.simulation.peersByID[to.id]);

				if (!path)
					throw new Error('Something went terribly wrong; the peer network is disconnected!');

				//for (var i = 0, len = path.length - 1; i < len; ++i)
				//	console.log([ts, path[i].id, path[i + 1].id, bytes, Object.keys(this.players).length, this.constructor.name].join(','));
				console.log([ts, (path.length - 1) * bytes, playerCount, this.simulation.activeConnections.length, path.length - 1, this.constructor.name].join(','));
			}
		};
	})();
}

class OursOpt extends Ours {
	route(ts, from, tos, bytes) {
		// Prioritise direct connections
		for (let c of this.simulation.peersByID[from].connections) {
			let other = c.peerA.id === from ? c.peerB : c.peerA;
			if (tos.includes(other.id)) {
				console.log([ts, from, other.id, bytes, Object.keys(this.players).length, this.constructor.name].join(','));
				tos.splice(tos.indexOf(other.id), 1);
			}
		}
	}
}

module.exports = {
	ClientServer,
	Complete,
	AOIComplete,
	Delaunay,
	Ours,
	OursOpt
};
