// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 peers for testing
var clacks4 = new clacks(key, cert)

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
	console.log("Peer 4 peers", clacks4.survey())
})
// Monitorion: Peer Updated
clacks4.onPeerUpdated(function(peer) {
	console.log("\nPeer 4 peer updated: " + peer.hostname + ":" + peer.port + " (" + peer.status + ")")
})

console.log('\nInitialising 4th local clacks peer, with send rate of 0.5 messages per second')
clacks4.init({port: 8004, sendrate: 0.5})

// Now announce peer 4 to peer 1
console.log("\nAnnounce Peer 4's presence to Peer 1")
clacks4.announce('localhost', 8001)

