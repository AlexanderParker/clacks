// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 peers for testing
console.log('\nInitialising 4th local clacks peer, with send rate of 0.5 messages per second')
var clacks4 = new clacks(key, cert, {port: 8004, sendrate: 0.5})

// Set up monitoring - message recieved
clacks4.onMessageRecieved(function(payload) {
	console.log("\nPeer 4 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
})
// Monitoring - message queued
clacks4.onMessageQueued(function(message) {
	console.log("Peer 4 message queue:", clacks4.peek())
})
// Set up monitoring - new peer discovered
clacks4.onPeerDiscovered(function(peer) {
	console.log("\nPeer 4 found new peer: " + peer.hostname + ":" + peer.port)
	console.log("Peer 4 peers", clacks4.getPeers())
})

// Don't announce, just wait
console.log("\nNot announcing, just waiting to see if this peer is remembered...")


