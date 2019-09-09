const xmlrpc = require('xmlrpc');

const client = xmlrpc.createClient({ host: 'iplane.cs.washington.edu', port: 7820, path: '/'})

client.methodCall('iplane.query', [{ src: '46.101.140.219', dst: '216.58.204.46' }], function (error, value) {
	console.log(error);
	console.log('Method response for \'anAction\': ' + value);
})
