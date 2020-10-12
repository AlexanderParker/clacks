// Include clacks library
var clacks = require ('./index.js')

// Allocate 3 towers for testing
var clacks4 = clacks()

// Set up monitoring - message recieved
clacks4.onMessageRecieved(function(payload) {
	console.log("\nTower 4 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	console.log("Tower 4 message queue:", clacks4.peek())
})
// Set up monitoring - new tower discovered
clacks4.onTowerDiscovered(function(tower) {
	console.log("\nTower 4 found new tower: " + tower.hostname + ":" + tower.port)
	console.log("Tower 4 peers", clacks4.survey())
})
// Monitorion: Tower Updated
clacks4.onTowerUpdated(function(tower) {
	console.log("\nTower 4 peer tower updated: " + tower.hostname + ":" + tower.port + " (" + tower.status + ")")
})

console.log('\nInitialising 4th local clacks tower, with send rate of 0.5 messages per second')
clacks4.init({port: 8004, sendrate: 0.5})

// Now announce tower 4 to tower 1
console.log("\nAnnounce Tower 4's presence to Tower 1")
clacks4.announce('localhost', 8001)

