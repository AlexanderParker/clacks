// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 peers for testing
console.log('\nInitialising 6th local clacks peer, with send rate of 0.5 messages per second')
var clacks6 = new clacks(key, cert, {port: 8006, sendrate: 0.5})

// Set up monitoring - message recieved
clacks6.onMessageRecieved(function(payload) {
	console.log("\nPeer 6 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)	
	payload.message = payload.message.split("").reverse().join("")
	console.log("\nReversed message: " + payload.message)
})
// Monitoring - message queued
clacks6.onMessageQueued(function(message) {
	console.log("Peer 6 message queue:", clacks6.peek())
})
// Set up monitoring - new peer discovered
clacks6.onPeerDiscovered(function(peer) {
	console.log("\nPeer 6 found new peer: " + peer.hostname + ":" + peer.port)
	console.log("Peer 6 peers", clacks6.getPeers())
})
// Monitorion: Peer Updated
clacks6.onPeerUpdated(function(peer) {
	console.log("\nPeer 6 peer updated: " + peer.hostname + ":" + peer.port + " (" + peer.status + ")")
	console.log("Peer 6 peers", clacks6.getPeers())
})

// Now announce peer 5 to peer 1
console.log("\nAnnounce Peer 6's presence to Peer 1")
clacks6.announce('localhost', 8001)

