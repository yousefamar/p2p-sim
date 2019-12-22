class Player {
	static _id = 'A';

	aoiSet = new Set();

	constructor(x, y) {
		this.id = Player._id;
		Player._id = String.fromCharCode(Player._id.charCodeAt(0) + 1);
		this.x  = x;
		this.y  = y;
	}

	isPlayerWithinAOI(aoiR, player) {
		let dx = Math.abs(player.x - this.x);
		if (Math.abs(dx) > aoiR)
			return false;
		let dy = Math.abs(player.y - this.y);
		if (Math.abs(dy) > aoiR)
			return false;
		return Math.sqrt(dx * dx + dy * dy) <= aoiR;
	}

	updateAOISet(aoiR, players) {
		this.aoiSet.clear();
		for (let p of players)
			if (this.isPlayerWithinAOI(aoiR, p))
				this.aoiSet.add(p);
	}

	toString() {
		return this.id;
	}
}

let aoiR = 2;
let players = new Set();

function addPlayer(player) {
	for (let p of players) {
		p.aoiSet.delete(player);
		if (p.isPlayerWithinAOI(aoiR, player))
			p.aoiSet.add(player);
	}
	//players.add(player);
	player.updateAOISet(aoiR, players);
	players.add(player);
}

function removePlayer(player) {
	for (let p of players)
		p.aoiSet.delete(player);
	players.delete(player);
}

addPlayer(new Player(0, 0));
addPlayer(new Player(0, 1));
addPlayer(new Player(0, 2.5));
addPlayer(new Player(1, 2));

for (let p of players)
	console.log(p + ': ' + [...p.aoiSet].join(', '));
console.log();

//let ordered = Array.from(players).sort((a, b) => b.aoiSet.size - a.aoiSet.size);

//for (let p of ordered) {
//	
//}

function visit(player) {
	if (player.visited)
		return 0;
	player.visited = true;
	let sum = 1;
	for (let p of player.aoiSet)
		sum += visit(p);
	return sum;
}

for (let p of players)
	p.visited = false;

let groupSizes = [];

for (let p of players) {
	if (p.visited)
		continue;
	groupSizes.push(visit(p));
}

console.log(groupSizes);
console.log(groupSizes.reduce((a, b) => a + b, 0));
