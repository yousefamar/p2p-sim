const fs = require('fs');
const dir = '/home/amar/share/mlrecs/';
const players = JSON.parse(fs.readFileSync(dir + 'players-mift.json'));

for (let p of players)
	if ('mifts' in p)
		p.miftCount = p.mifts.length;

fs.writeFileSync(dir + 'players-mift.json', JSON.stringify(players));
