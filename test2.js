// Include clacks library
var clacks = require ('./index.js')

// Allocate 3 stations for testing
var clacks4 = clacks()

// Set up monitoring - message recieved
clacks4.onMessageRecieved(function(payload) {
	console.log("\nStation 4 recieved message: " + payload.message + " from " + payload.sender.hostname + ":" + payload.sender.port)
	console.log("Station 4 message queue:", clacks4.peek())
})
// Set up monitoring - new station discovered
clacks4.onStationDiscovered(function(station) {
	console.log("\nStation 4 found new station: " + station.hostname + ":" + station.port)
	console.log("Station 4 peers", clacks4.survey())
})
// Monitorion: Station Updated
clacks4.onStationUpdated(function(station) {
	console.log("\nStation 4 peer station updated: " + station.hostname + ":" + station.port + " (" + station.status + ")")
})

console.log('\nInitialising 4th local clacks station, with send rate of 0.5 messages per second')
clacks4.init({port: 8004, sendrate: 0.5})

// Now announce station 4 to station 1
console.log("\nAnnounce Station 4's presence to Station 1")
clacks4.announce('localhost', 8001)

