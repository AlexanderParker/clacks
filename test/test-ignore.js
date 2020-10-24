// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 peers for testing
console.log('\nInitialising 5th local clacks peer, with send rate of 0.5 messages per second')
var clacks5 = new clacks(key, cert, {port: 8005, sendrate: 0.5})

// Set up monitoring - message recieved
clacks5.onMessageRecieved(function(payload) {
	console.log("\nPeer 5 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
})
// Monitoring - message queued
clacks5.onMessageQueued(function(message) {
	console.log("Peer 5 message queue:", clacks5.peek())
})
// Set up monitoring - new peer discovered
clacks5.onPeerDiscovered(function(peer) {
	console.log("\nPeer 5 found new peer: " + peer.hostname + ":" + peer.port)
	console.log("Peer 5 peers", clacks5.getPeers())
})
// Monitorion: Peer Updated
clacks5.onPeerUpdated(function(peer) {
	console.log("\nPeer 5 peer updated: " + peer.hostname + ":" + peer.port + " (" + peer.status + ")")
	console.log("Peer 5 peers", clacks5.getPeers())
})

// Now announce peer 5 to peer 1
console.log("\nAnnounce Peer 5's presence to Peer 1")
clacks5.announce('localhost', 8001)

// And ignore peer 2
console.log("\nIgnore peer 2 - should not recieve any messages from 8002")
clacks5.ignore('localhost', 8002)
