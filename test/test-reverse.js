// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 towers for testing
var clacks6 = clacks(key, cert)

// Set up monitoring - message recieved
clacks6.onMessageRecieved(function(payload) {
	console.log("\nTower 6 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)	
	payload.message = payload.message.split("").reverse().join("")
	console.log("\nReversed message: " + payload.message)
})
// Monitoring - message queued
clacks6.onMessageQueued(function(message) {
	console.log("Tower 6 message queue:", clacks6.peek())
})
// Set up monitoring - new tower discovered
clacks6.onTowerDiscovered(function(tower) {
	console.log("\nTower 6 found new tower: " + tower.hostname + ":" + tower.port)
	console.log("Tower 6 peers", clacks6.survey())
})
// Monitorion: Tower Updated
clacks6.onTowerUpdated(function(tower) {
	console.log("\nTower 6 peer tower updated: " + tower.hostname + ":" + tower.port + " (" + tower.status + ")")
	console.log("Tower 6 peers", clacks6.survey())
})

console.log('\nInitialising 6th local clacks tower, with send rate of 0.5 messages per second')
clacks6.init({port: 8006, sendrate: 0.5})

// Now announce tower 5 to tower 1
console.log("\nAnnounce Tower 6's presence to Tower 1")
clacks6.announce('localhost', 8001)

