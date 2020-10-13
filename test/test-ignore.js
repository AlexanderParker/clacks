// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Include clacks library
var clacks = require ('../index.js'),
	fs = require('fs'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 towers for testing
var clacks5 = clacks(key, cert)

// Set up monitoring - message recieved
clacks5.onMessageRecieved(function(payload) {
	console.log("\nTower 5 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	console.log("Tower 5 message queue:", clacks5.peek())
})
// Set up monitoring - new tower discovered
clacks5.onTowerDiscovered(function(tower) {
	console.log("\nTower 5 found new tower: " + tower.hostname + ":" + tower.port)
	console.log("Tower 5 peers", clacks5.survey())
})
// Monitorion: Tower Updated
clacks5.onTowerUpdated(function(tower) {
	console.log("\nTower 5 peer tower updated: " + tower.hostname + ":" + tower.port + " (" + tower.status + ")")
	console.log("Tower 5 peers", clacks5.survey())
})

console.log('\nInitialising 5th local clacks tower, with send rate of 0.5 messages per second')
clacks5.init({port: 8005, sendrate: 0.5})

// Now announce tower 5 to tower 1
console.log("\nAnnounce Tower 5's presence to Tower 1")
clacks5.announce('localhost', 8001)

// And ignore tower 2
console.log("\nIgnore tower 2 - should not recieve any messages from 8002")
clacks5.ignore('localhost', 8002)
