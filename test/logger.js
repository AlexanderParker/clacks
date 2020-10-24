// Implements a basic message logger, useful for profiling and debugging
const fs = require('fs')

/*
	Initialise the plugin with options.

	Options format:
	{
		directory: 'base/log/directory',
		type: 'message|announce|all'
	}

	Default options:

	directory: "./logger"
	type: "./all"
*/
function plugin(options) {
	var logDirectory = "./logger",
		logType = "all"

	// Apply options overrides
	if (!!options && !!options.directory) logDirectory = options.directory
	if (!!options && !!options.type) logDirectory = options.type

	// Check logger directory
	if (!fs.existsSync(logDirectory)) {
		fs.mkdirSync(logDirectory, {recursive: true});
	}

	return function(peer, payload, req, res) {
		// Crude way to ensure valid identifier
		if (!peer || !peer.identifier || !peer.identifier.match(/[A-Fa-f0-9]{64}/)) return		

		// Only log messages
		if (logType != 'all' && (!payload.type || payload.type != logType)) return

		// Message is logged to filesystem in logir/identifier/timestamp
		var peerLogDirectory = logDirectory + '/' + peer.identifier
			peerLogFilename = Date.now()

		// Ensure log directory exists (is sync for now, may improve later)
		if (!fs.existsSync(peerLogDirectory)) {
			fs.mkdirSync(peerLogDirectory);
		}

		// Log message to the file (is sync for now, may improve later)
		fs.writeFileSync(peerLogDirectory + '/' + peerLogFilename, JSON.stringify({
			peer: peer,
			payload: payload
		}))
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
clacks1.extend(new plugin({directory:"./logger/clacks1"}))
clacks2.extend(new plugin({directory:"./logger/clacks2"}))
clacks3.extend(new plugin({directory:"./logger/clacks3"}))

console.log('\nLet peers 1 & 2 to see one another')
clacks1.addPeer('localhost','8002')
clacks2.addPeer('localhost','8001')

console.log("\nEnqueing 'Hello Discworld!' on Peer 2")
clacks2.enqueue('Hello Discworld!')

// Now add a third peer
console.log("\nAnnounce Peer 3's presence to Peer 1")
clacks3.announce('localhost', 8001)