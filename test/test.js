// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 peers for testing
var clacks1 = new clacks(key, cert),
    clacks2 = new clacks(key, cert),
    clacks3 = new clacks(key, cert)

// Monitoring - message recieved
clacks1.onMessageRecieved(function(payload) {
	console.log("\nPeer 1 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
})
clacks2.onMessageRecieved(function(payload) {
	console.log("\nPeer 2 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
})
clacks3.onMessageRecieved(function(payload) {
	console.log("\nPeer 3 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
})
// Monitoring - message queued
clacks1.onMessageQueued(function(message) {
	console.log("\nPeer 1 message queued: " + message)
	peekAll()
})
clacks2.onMessageQueued(function(message) {
	console.log("\nPeer 2 message queued: " + message)
	peekAll()
})
clacks3.onMessageQueued(function(message) {
	console.log("\nPeer 3 message queued: " + message)
	peekAll()
})
// Monitoring - Peer discovered
clacks1.onPeerDiscovered(function(peer) {
	console.log("\nPeer 1 found new peer: " + peer.hostname + ":" + peer.port)
})
clacks2.onPeerDiscovered(function(peer) {
	console.log("\nPeer 2 found new peer: " + peer.hostname + ":" + peer.port)
})
clacks3.onPeerDiscovered(function(peer) {
	console.log("\nPeer 3 found new peer: " + peer.hostname + ":" + peer.port)
})
// Monitorion: Peer Updated
clacks1.onPeerUpdated(function(peer) {
	console.log("\nPeer 1 peer updated: " + peer.hostname + ":" + peer.port + " (" + peer.status + ")")
})
clacks2.onPeerUpdated(function(peer) {
	console.log("\nPeer 2 peer updated: " + peer.hostname + ":" + peer.port + " (" + peer.status + ")")
})
clacks3.onPeerUpdated(function(peer) {
	console.log("\nPeer 3 peer updated: " + peer.hostname + ":" + peer.port + " (" + peer.status + ")")
})

console.log('\nInitialising 3 local clacks peers, each with send rate of 0.5 messages per second')
clacks1.init({port: 8001, sendrate: 0.5})
clacks2.init({port: 8002, sendrate: 0.5})
clacks3.init({port: 8003, sendrate: 0.5})

console.log("\nClacks Peers List - Initial State")
surveyAll()

console.log('\nLet peers 1 & 2 to see one another')
clacks1.expand('localhost','8002')
clacks2.expand('localhost','8001')

console.log("\nClacks Message List - Pre-enqueue")
peekAll()

console.log("\nEnqueing 'Hello Discworld!' on Peer 2")
clacks2.enqueue('Hello Discworld!')

console.log("\nClacks Message List - Post-enqueue")
peekAll()

// Now add a third peer
console.log("\nAnnounce Peer 3's presence to Peer 1")
clacks3.announce('localhost', 8001)

// Couple of simple helpers for the test
function peekAll() {
	console.log("Peer 1", clacks1.peek())
	console.log("Peer 2", clacks2.peek())
	console.log("Peer 3", clacks3.peek())
}

function surveyAll() {
	console.log("Peer 1", clacks1.survey())
	console.log("Peer 2", clacks2.survey())
	console.log("Peer 3", clacks3.survey())
}