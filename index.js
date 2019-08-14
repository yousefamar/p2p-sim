class Peer {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.connections = [];
		this.visited = false;
		this.activeCount = 0;
	}
}

class Connection {
	constructor(peerA, peerB) {
		this.peerA = peerA;
		this.peerB = peerB;
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
		this.connections = [];
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
	}

	removePeer(peer) {
		// TODO: Optimise
		for (let other of peer.connections.map(c => c.peerA === peer ? c.peerB : c.peerA))
			for (let connection of peer.connections)
				other.connections.splice(other.connections.indexOf(connection), 1);
		for (let connection of peer.connections)
			this.connections.splice(this.connections.indexOf(connection), 1);
		this.peers.splice(this.peers.indexOf(peer), 1);
	}

	crawlMST(peer, connectionQueue) {
		peer.visited = true;
		for (let c of peer.connections)
			if (connectionQueue.indexOf(c) < 0)
				connectionQueue.push(c);
		connectionQueue.sort((a, b) => a.distance - b.distance);
		for (let c of connectionQueue) {
			let other = c.peerA === peer ? c.peerB : c.peerA;
			if (c.active || other.visited)
				continue;
			c.activate();
			this.crawlMST(c.peerA === peer ? c.peerB : c.peerA, connectionQueue);
			return;
		}
	};

	computeMST() {
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
	}
}

document.addEventListener('DOMContentLoaded', () => {
	let svg = d3.select('body')
		.append('svg:svg')

	var width  = window.innerWidth;
	var height = window.innerHeight;
	var radius = 32;
	var circleCount = 10;

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
		line
			.style('stroke', d => d.redundant ? 'red' : d.active ? 'black' : '#F0F0F0')
			.style('stroke-width', d => d.active ? 3 : 1);
	});

	var peers = d3.range(circleCount).map(() => {
		return new Peer(Math.round(Math.random() * (width - radius * 2) + radius),
			Math.round(Math.random() * (height - radius * 2) + radius));
	});

	peers.forEach(p => simulation.addPeer(p));
	simulation.computeMST();

	var color = d3.scaleOrdinal(d3.schemeCategory10);

	let line = svg.selectAll('line')
		.data(simulation.connections)
		.enter().append('line')
		.attr('x1', d => d.peerA.x)
		.attr('y1', d => d.peerA.y)
		.attr('x2', d => d.peerB.x)
		.attr('y2', d => d.peerB.y)
		.style('stroke', d => d.redundant ? 'red' : d.active ? 'black' : '#F0F0F0')
		.style('stroke-width', d => d.active ? 3 : 1);

	let text = svg.selectAll('text')
		.data(simulation.connections)
		.enter().append('text')
		.attr('x', d => 0.5 * (d.peerA.x + d.peerB.x))
		.attr('y', d => 0.5 * (d.peerA.y + d.peerB.y))
		.style('fill', '#F0F0F0')
		.text(d => d.distance);

	let circle = svg.selectAll('circle')
		.data(peers)
		.enter().append('circle')
		.attr('cx', d => d.x)
		.attr('cy', d => d.y)
		.attr('r', radius)
		.style('fill', function(d, i) { return color(i); })
		.call(d3.drag()
			.on('start', dragstarted)
			.on('drag', dragged)
			.on('end', dragended));

	function dragstarted(d) {
		d3.select(this).raise().classed('active', true);
	}

	function dragged(d) {
		let peer = d3.select(this).data()[0];
		peer.x = d3.event.x;
		peer.y = d3.event.y;
		peer.connections.forEach(c => c.recomputeDistance());
		simulation.computeMST();
		d3.select(this)
			.attr('cx', d.x = d3.event.x)
			.attr('cy', d.y = d3.event.y);
		// TODO: Optimise
		line
			.attr('x1', d => d.peerA.x)
			.attr('y1', d => d.peerA.y)
			.attr('x2', d => d.peerB.x)
			.attr('y2', d => d.peerB.y)
			.style('stroke', d => d.redundant ? 'red' : d.active ? 'black' : '#F0F0F0')
			.style('stroke-width', d => d.active ? 3 : 1);
		text
			.attr('x', d => 0.5 * (d.peerA.x + d.peerB.x))
			.attr('y', d => 0.5 * (d.peerA.y + d.peerB.y))
			.text(d => d.distance);
	}

	function dragended(d) {
		d3.select(this).classed('active', false);
	}

	//const socket = io();

	//socket.on('packet', packet => {
	//	console.log(packet);
	//});

});
