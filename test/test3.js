// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 towers for testing
var clacks4 = clacks(key, cert)

// Set up monitoring - message recieved
clacks4.onMessageRecieved(function(payload) {
	console.log("\nTower 4 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
})
// Monitoring - message queued
clacks4.onMessageQueued(function(message) {
	console.log("Tower 4 message queue:", clacks4.peek())
})
// Set up monitoring - new tower discovered
clacks4.onTowerDiscovered(function(tower) {
	console.log("\nTower 4 found new tower: " + tower.hostname + ":" + tower.port)
	console.log("Tower 4 peers", clacks4.survey())
})

console.log('\nInitialising 4th local clacks tower, with send rate of 0.5 messages per second')
clacks4.init({port: 8004, sendrate: 0.5})

// Don't announce, just wait
console.log("\nNot announcing, just waiting to see if this tower is remembered...")


