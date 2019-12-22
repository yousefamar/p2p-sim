const fs = require('fs');
let request = require('request-promise-native');
const cookieJar = request.jar();

request = request.defaults({ jar: cookieJar });

const ml  = 'http://manyland.com/'
const dir = '/home/amar/share/mlrecs/';

//const players = request(dir + 'players.json');
const players = JSON.parse(fs.readFileSync(dir + 'players-mift.json'));
players.sort((a, b) => b.rank - a.rank);

const cliProgress = require('cli-progress');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// So we don't bombard Manyland
let sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

let crawled = {};

let crawl = async user => {
	user.mifts = await getAllUserMifts(user.id);
	crawled[user.id] = user;

	for (let mift of user.mifts) {
		if (mift.fromId in crawled)
			continue;
		await crawl({ id: mift.fromId, name: mift.fromName });
	};
};

(async () => {
	// Populate cookie jar
	await request(ml);
	await request(ml + '?c');
	await request(ml);

	// Set X-CSRF header
	request = request.defaults({ headers: { 'X-CSRF': cookieJar.getCookies(ml).filter(cookie => cookie.key === 'act')[0].value } });

	// Start with Philipp
	//await crawl({ id: '5003d713a0b60c386b0000a1', name: 'philipp' });

	progressBar.start(players.length, 0);

	try {
		for (let i = 30000, len = players.length; i < len; ++i) {
			let p = players[i];
			p.mifts = await getAllUserMifts(p.id);
			progressBar.update(i);
			if (i % 10000 === 0)
				fs.writeFileSync(dir + 'players-mift.json', JSON.stringify(players));
		}
	} catch (e) {
		console.error(e);
	}

	progressBar.stop();

	console.log('Writing results...');
	fs.writeFileSync(dir + 'players-mift.json', JSON.stringify(players));
	console.log('Done');

	//console.log(JSON.stringify(crawled));
})();
