// Include clacks library
var clacks = require ('./index.js')

// Allocate 3 stations for testing
var clacks1 = clacks(),
    clacks2 = clacks(),
    clacks3 = clacks()

// Monitoring - message recieved
clacks1.onMessageRecieved(function(payload) {
	console.log("\nStation 1 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	peekAll()
})
clacks2.onMessageRecieved(function(payload) {
	console.log("\nStation 2 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	peekAll()
})
clacks3.onMessageRecieved(function(payload) {
	console.log("\nStation 3 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	peekAll()
})
// Monitoring - Station discovered
clacks1.onStationDiscovered(function(station) {
	console.log("\nStation 1 found new peer station: " + station.hostname + ":" + station.port)
})
clacks2.onStationDiscovered(function(station) {
	console.log("\nStation 2 found new peer station: " + station.hostname + ":" + station.port)
})
clacks3.onStationDiscovered(function(station) {
	console.log("\nStation 3 found new peer station: " + station.hostname + ":" + station.port)
})
// Monitorion: Station Updated
clacks1.onStationUpdated(function(station) {
	console.log("\nStation 1 peer station updated: " + station.hostname + ":" + station.port + " (" + station.status + ")")
})
clacks2.onStationUpdated(function(station) {
	console.log("\nStation 2 peer station updated: " + station.hostname + ":" + station.port + " (" + station.status + ")")
})
clacks3.onStationUpdated(function(station) {
	console.log("\nStation 3 peer station updated: " + station.hostname + ":" + station.port + " (" + station.status + ")")
})

console.log('\nInitialising 3 local clacks stations, each with send rate of 0.5 messages per second')
clacks1.init({port: 8001, sendrate: 0.5})
clacks2.init({port: 8002, sendrate: 0.5})
clacks3.init({port: 8003, sendrate: 0.5})

console.log("\nClacks Peers List - Initial State")
surveyAll()

console.log('\nLet stations 1 & 2 to see one another')
clacks1.expand('localhost','8002')
clacks2.expand('localhost','8001')

console.log("\nClacks Message List - Pre-enqueue")
peekAll()

console.log("\nEnqueing 'Hello Discworld!' on Station 2")
clacks2.enqueue('Hello Discworld!')

console.log("\nClacks Message List - Post-enqueue")
peekAll()

// Now add a third station
console.log("\nAnnounce Station 3's presence to Station 1")
clacks3.announce('localhost', 8001)

// Couple of simple helpers for the test
function peekAll() {
	console.log("Station 1", clacks1.peek())
	console.log("Station 2", clacks2.peek())
	console.log("Station 3", clacks3.peek())
}

function surveyAll() {
	console.log("Station 1", clacks1.survey())
	console.log("Station 2", clacks2.survey())
	console.log("Station 3", clacks3.survey())
}