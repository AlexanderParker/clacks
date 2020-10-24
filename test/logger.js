// Implements a basic message logger, useful for profiling and debugging
const fs = require('fs')

function plugin(options) {
	var logDirectory = "./logger"

	// Check logger directory
	if (!fs.existsSync(logDirectory)) {
		fs.mkdirSync(logDirectory, {recursive: true});
	}

	return function(peer, payload, req, res) {
		// Only log messages
		if (!payload.type || payload.type != 'message') return

		console.log(peer, payload)
	}
}

/**
 * Set up some peers to test the logger plugin
 */

// Allow self-signed certificate in development - don't do this on production.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

// Include clacks library
var clacks = require ('../index.js'),
	key = fs.readFileSync('key.pem'),
	cert = fs.readFileSync('cert.pem')

// Allocate 3 peers for testing
console.log('\nInitialising 3 local clacks peers, each with send rate of 0.5 messages per second')
var clacks1 = new clacks(key, cert, {port: 8001, sendrate: 0.5}),
    clacks2 = new clacks(key, cert, {port: 8002, sendrate: 0.5}),
    clacks3 = new clacks(key, cert, {port: 8003, sendrate: 0.5})

// Extend each clacks instance with the logger plugin
console.log('\nExtending each clacks instance with logger plugin')
clacks1.extend(new plugin({}))
clacks2.extend(new plugin({}))
clacks3.extend(new plugin({}))

console.log('\nLet peers 1 & 2 to see one another')
clacks1.addPeer('localhost','8002')
clacks2.addPeer('localhost','8001')

console.log("\nEnqueing 'Hello Discworld!' on Peer 2")
clacks2.enqueue('Hello Discworld!')

// Now add a third peer
console.log("\nAnnounce Peer 3's presence to Peer 1")
clacks3.announce('localhost', 8001)