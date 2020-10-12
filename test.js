// Include clacks library
var clacks = require ('./index.js')

// Allocate 3 towers for testing
var clacks1 = clacks(),
    clacks2 = clacks(),
    clacks3 = clacks()

// Monitoring - message recieved
clacks1.onMessageRecieved(function(payload) {
	console.log("\nTower 1 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	peekAll()
})
clacks2.onMessageRecieved(function(payload) {
	console.log("\nTower 2 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	peekAll()
})
clacks3.onMessageRecieved(function(payload) {
	console.log("\nTower 3 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	peekAll()
})
// Monitoring - Tower discovered
clacks1.onTowerDiscovered(function(tower) {
	console.log("\nTower 1 found new peer tower: " + tower.hostname + ":" + tower.port)
})
clacks2.onTowerDiscovered(function(tower) {
	console.log("\nTower 2 found new peer tower: " + tower.hostname + ":" + tower.port)
})
clacks3.onTowerDiscovered(function(tower) {
	console.log("\nTower 3 found new peer tower: " + tower.hostname + ":" + tower.port)
})
// Monitorion: Tower Updated
clacks1.onTowerUpdated(function(tower) {
	console.log("\nTower 1 peer tower updated: " + tower.hostname + ":" + tower.port + " (" + tower.status + ")")
})
clacks2.onTowerUpdated(function(tower) {
	console.log("\nTower 2 peer tower updated: " + tower.hostname + ":" + tower.port + " (" + tower.status + ")")
})
clacks3.onTowerUpdated(function(tower) {
	console.log("\nTower 3 peer tower updated: " + tower.hostname + ":" + tower.port + " (" + tower.status + ")")
})

console.log('\nInitialising 3 local clacks towers, each with send rate of 0.5 messages per second')
clacks1.init({port: 8001, sendrate: 0.5})
clacks2.init({port: 8002, sendrate: 0.5})
clacks3.init({port: 8003, sendrate: 0.5})

console.log("\nClacks Peers List - Initial State")
surveyAll()

console.log('\nLet towers 1 & 2 to see one another')
clacks1.expand('localhost','8002')
clacks2.expand('localhost','8001')

console.log("\nClacks Message List - Pre-enqueue")
peekAll()

console.log("\nEnqueing 'Hello Discworld!' on Tower 2")
clacks2.enqueue('Hello Discworld!')

console.log("\nClacks Message List - Post-enqueue")
peekAll()

// Now add a third tower
console.log("\nAnnounce Tower 3's presence to Tower 1")
clacks3.announce('localhost', 8001)

// Couple of simple helpers for the test
function peekAll() {
	console.log("Tower 1", clacks1.peek())
	console.log("Tower 2", clacks2.peek())
	console.log("Tower 3", clacks3.peek())
}

function surveyAll() {
	console.log("Tower 1", clacks1.survey())
	console.log("Tower 2", clacks2.survey())
	console.log("Tower 3", clacks3.survey())
}