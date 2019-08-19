const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const TracePlayback = require('./trace-playback.js')

app.use(express.static('static'));

io.on('connection', socket => {
	console.log('connected');

	let tp = new TracePlayback('mlrecs/2019-08-12-starbucks-msgs.mlrec', 'mlrecs/2019-08-12-starbucks-stat.mlrec', {
		playbackBufferSize: 100000,
		tickTimeMs: 100
	});

	tp.on('packet', packet => {
		if (packet.type === 'SPEECH')
			return;
		socket.emit(packet.type || 'STAT', packet);
	});

	tp.on('end', () => {
		socket.emit('end');
	});

	tp.playback();

	socket.on('disconnect', () => {
		console.log('dc');
	});

});

http.listen(process.env.PORT || 8096);
