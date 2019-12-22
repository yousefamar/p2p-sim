const fs = require('fs');
let request = require('request-promise-native');
const cookieJar = request.jar();

request = request.defaults({ jar: cookieJar });

const ml  = 'http://manyland.com/'
const dir = '/home/amar/share/mlrecs/';

//const players = request(dir + 'players.json');
const players = JSON.parse(fs.readFileSync(dir + 'players-mift.json'));
players.sort((a, b) => b.rank - a.rank);
const playersByID = {};
for (let p of players) {
	playersByID[p.id] = p;
}
console.log(players.length, 'players loaded');
console.log(Object.keys(playersByID).length, 'unique IDs');

const cliProgress = require('cli-progress');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// So we don't bombard Manyland
let sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let getPlayerInfo = async id => {
	try {
		await sleep(1000);
		return await request({
			method: 'POST',
			url: ml + 'j/u/pi/',
			form: {
				id: id,
			},
			json: true
		});
	} catch (e) {
		console.error('Error getting player info:', e);
	}
};

let getPlayerProfilePicID = async id => {
	try {
		await sleep(1000);
		return (await request({
			method: 'GET',
			url: ml + 'j/u/gi/' + id,
			json: true
		})).iconId;
	} catch (e) {
		console.error('Error getting profile pic ID:', e);
	}
};

let fetchPlayer = async player => {
	let info = await getPlayerInfo(player.id);
	if (!info)
		return;
	player.name = info.screenName;
	player.rank = info.rank;
	player.isFullAccount = info.isFullAccount;
	player.hasMinfinity = info.hasMinfinity;
	player.isBacker = info.isBacker;
	let d = new Date();
	d.setDate(d.getDate() - info.ageDays);
	player.joinedTimestamp = d.getTime();
	let profilePicID = await getPlayerProfilePicID(player.id);
	if (profilePicID)
		player.profilePicID = profilePicID;
};

let getAllUserMifts = (() => {
	let getUserMifts = async (id, before = '') => {
		let tries = 0;
		while (tries < 10) {
			try {
				await sleep(200);
				return await request({
					method: 'POST',
					url: 'http://manyland.com/j/mf/grm/',
					form: {
						'olderThan': before,
						'setSize': 5,
						'id': id
					},
					json: true
				});
			} catch (e) {
				//console.error('Error fetching mifts:', e);
				console.error('Error fetching mifts, trying again in ' + (++tries) + 's (' + tries + ' / 10)');
				await sleep(tries * 1000);
			}
		}
	};

	return async id => {
		let mifts = [];
		let set;
		let before = '';

		do {
			set = await getUserMifts(id, before);
			if (!set) {
				throw 'Failed to fetch mifts for ' + id
			}
			set = set.results;
			mifts.push.apply(mifts, set.slice(0, 4));
			if (set.length < 5)
				break;
			before = set[3].ts;
		} while(true);

		return mifts;
	};
})();

let crawl = async player => {
	if (player.id in playersByID)
		return;

	await fetchPlayer(player);
	player.mifts = await getAllUserMifts(player.id);

	players.push(player);
	playersByID[player.id] = player;

	for (let mift of player.mifts)
		await crawl({ id: mift.fromId });
};

(async () => {
	// Populate cookie jar
	await request(ml);
	await request(ml + '?c');
	await request(ml);

	// Set X-CSRF header
	request = request.defaults({ headers: { 'X-CSRF': cookieJar.getCookies(ml).filter(cookie => cookie.key === 'act')[0].value } });

	let remainders = fs.readFileSync(dir + 'mift-remainders.txt', 'utf8').trim().split('\n');
	console.log(remainders.length, 'players to crawl from');

	let progress = 0;
	progressBar.start(remainders.length, progress);
	for (let r of remainders) {
		if (r in playersByID)
			continue;
		await crawl({ id: r });
		progressBar.update(++progress);
	}
	progressBar.stop();

	console.log(players.length, 'new player list size');

	console.log('Writing results...');
	fs.writeFileSync(dir + 'players-mift.json', JSON.stringify(players));
	console.log('Done');
})();
