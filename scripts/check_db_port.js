const net = require('net');

const client = new net.Socket();

client.setTimeout(2000);

client.connect(27017, '127.0.0.1', function() {
	console.log('Connected');
	client.destroy();
});

client.on('error', function(err) {
	console.log('Connection failed: ' + err.message);
	client.destroy();
});

client.on('timeout', function() {
	console.log('Connection timed out');
	client.destroy();
});
