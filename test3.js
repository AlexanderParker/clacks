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

console.log('\nInitialising 4th local clacks station, with send rate of 0.5 messages per second')
clacks4.init({port: 8004, sendrate: 0.5})

// Don't announce, just wait
console.log("\nNot announcing, just waiting to see if this station is remembered...")


