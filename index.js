module.exports = function(sslKey, sslCert, optionOverrides /* optional */) {
	// SSL certificate and key is mandatory
	if (!sslKey || !sslCert) throw 'Undefined HTTPS key and/or certificate.'

	var sha256 = require('crypto-js/sha256'),
		https = require('https'),
		onMessageRecievedCallbacks = [],	// Callbacks executed when messages are received. 		[function callback(<payload>) {}]	
		onPeerDiscoveredCallbacks = [],		// Callbacks executed when new peers are discovered 	[function callback(<peer>) {}]	
		onPeerUpdatedCallbacks = [],		// Callbacks executed when a peer is updated. 			[function callback(<peer>) {}]	
		onMessageQueuedCallbacks = [],		// Callbacks executed when a message is queued. 		[function callback(<message>) {}]
		pluginCallbacks = [],				// Callbacks executed on payloads, see plugin docs		[function callback(<peer>, <payload>, req, res) {}]
		/*
			Peers are other known clacks hosts. We keep track of their address,
			active status, and the time that status last updated.


			Peers format:

			   	peers[status][identifier] = {
				  identifier: '<sha256 hash of peer hostname+port>',
				  hostname: '<peer hostname>',
				  port: '<peer port>',
				  status: '<peer status>',
				  time: <int timestamp of last status change>
				}

			Status meanings:

				new:     Newly added, unknown actual status
				alive:   Was alive when last contacted
				lost:    Missing from network, might be temporary
				dead:    Missing from network, probably permanent
				ignored: Known peer to be ignored
		*/
		peers = {
			new: {},
			alive: {},
			lost: {},
			dead: {},
			ignored: {}
		},
		/*
			The queue contains messages to broadcast.

			Items the host receives are enqueued, items that are sent are dequeued.

			Items may also be manually queued.
		*/
		queue = [],
		// Default options, can be overridden with init(options)
		options = {
			// Send rate (messages per second)
			sendrate: 1,
			// Server port
			port: 8080,
			// server hostname (self reported)
			hostname: 'localhost',
			// timeout in ms after which lost peers are pronounced 'dead'
			killtimeout: 3600000,
			// Possible log classes: "critical", "network"
			logClasses: [],
		},
		// Generate the clacks server object
		clacksInstance = {
			// Add a new message to this peers message queue
			enqueue: function(message) {
				if (!!message) {
					queue.push(message)
					onMessageQueuedCallbacks.forEach(function(cb){
						cb.bind(this)(message)
					}.bind(this))
				}
			},
			// Remove and return a message from the head of the queue
			dequeue: function() {
				return queue.shift()
			},
			// Return the entire message queue
			peek: function() {
				return queue
			},
			// Returns true if the message queue is empty
			isEmpty: function() {
				return queue.length == 0
			},
			// Anounce our presence to another peer
			announce: function(hostname, port) {
				send(
					null,
					hostname,
					port,
					'announce',
					this,
					function(responseCode, responseData) {
						if (responseCode == '200') {
							// Update the peer
							this.addPeer(hostname, port)
						} else {
							this.log('network', [responseCode, responseData])
						}
					}.bind(this)
				)
			},
			// Retrieve a peer by identifier, or null
			getPeer: function(identifier) {
				if (peers['ignored'].hasOwnProperty(identifier)) return peers['ignored'][identifier]
				if (peers['alive'].hasOwnProperty(identifier)) return peers['alive'][identifier]
				if (peers['new'].hasOwnProperty(identifier)) return peers['new'][identifier]
				if (peers['dead'].hasOwnProperty(identifier)) return peers['dead'][identifier]
				if (peers['lost'].hasOwnProperty(identifier)) return peers['lost'][identifier]
			},
			// Add a new peer to the clacks network
			addPeer: function(hostname, port, status) {		

				var identifier = sha256(hostname+port).toString()
					targetStatus = status || 'new'

				// Don't add this actual peer to the list
				if (hostname == options.hostname && port == options.port) return

				// Don't add existing peers
				if (this.getPeer(identifier)) return

				// Add the new peer
				peers[targetStatus][identifier] = {
					identifier: identifier,
					hostname: hostname,
					port: port,
					status: targetStatus,
					time: Date.now()
				}

				// Trigger new peer added event
				onPeerDiscoveredCallbacks.forEach(function(cb){
					cb(peers[targetStatus][identifier])
				}.bind(this))
			},
			// Updates a peer to specifed status
			update: function(peer, status) {
				// No need to update peer if status remains the same
				if (peer.status == status || peer.status == 'ignored') return
				// Remove peer from old status
				delete(peers[peer.status][peer.identifier])
				// Update peer status
				peer.status = status
				peer.time = Date.now()
				// Add peer to new status
				peers[peer.status][peer.identifier] = peer
				onPeerUpdatedCallbacks.forEach(function(cb){
					cb(peers[peer.status][peer.identifier])
				}.bind(this))
			},
			// Ignores a specified hostname and port
			ignore: function(hostname, port) {
				var identifier = sha256(hostname+port).toString(),
					peer = this.getPeer(identifier)

				if (!!peer) {
					this.update(peer, 'ignored')
				} else {
					// Add the new peer directly to the ignored list
					this.addPeer(hostname, port, 'ignored')
				}
			},
			// Retrieve current known peers statuses
			getPeers: function() {
				return peers
			},
			// Retrieve defined options
			getOptions: function() {
				return options
			},
			// Register callback triggered after a message is received
			onMessageRecieved: function(callback) {
				onMessageRecievedCallbacks.push(callback)
			},
			// Register callback triggered after a new peer is discovered
			onPeerDiscovered: function(callback) {
				onPeerDiscoveredCallbacks.push(callback)
			},
			// Register callback triggered after a new peer is discovered
			onPeerUpdated: function(callback) {
				onPeerUpdatedCallbacks.push(callback)
			},
			// Register callback triggered after a new message is queued
			onMessageQueued: function(callback) {
				onMessageQueuedCallbacks.push(callback)
			},
			// Register callback triggered on each recieved payload, before all other processing
			extend: function(callback) {
				pluginCallbacks.push(callback)
			},
			log: function (type, message) {
				if (options.logClasses.includes(type)) console.log(type, message)
			}
		}

	// Initialise this clacks host (options is optional)
	function init(optionOverrides) {
		// Parse options - todo, make generic
		if (typeof optionOverrides != 'undefined') {
			options.sendrate = optionOverrides.sendrate || options.sendrate
			options.port = optionOverrides.port || options.port
			options.hostname = optionOverrides.hostname || options.hostname
			options.logClasses = optionOverrides.log || options.hostname
		}

		// Start listening for messages
		var server = https.createServer({
			key: sslKey,
			cert: sslCert
		}, function(req, res) {
			// Assemble the received message data
			var data = []
			req.on('data', function(chunk) {
				// Todo - rate / flood limiting
				data.push(chunk)
			}.bind(this))

			// Process the complete received message data
			req.on('end', function() {
				try {						
					var payload = JSON.parse(data)
						identifier = sha256(payload.sender.hostname + payload.sender.port).toString()
						sourcePeer = this.getPeer(identifier)

					// Add or update peers list		
					if (!sourcePeer) {						
						this.addPeer(payload.sender.hostname, payload.sender.port)
						sourcePeer = this.getPeer(identifier)
					} else {
						this.update(sourcePeer, 'alive')						
					}

					// Execute plugin - if any plugin returns false no further processing occurs
					for (var cb of pluginCallbacks) {
						if (cb.bind(this)(sourcePeer, payload, req, res) === false) {
							res.end()
							return
						}
					}

					// Reject payloads from ignore list
					if (!!sourcePeer && sourcePeer.status == 'ignored') {
						res.writeHead(403)
						res.end()
						return
					}

					// Todo - add some logic to validate payloads and add abusers to ignored list
					switch (payload.type) {
						case 'message':
							onMessageRecievedCallbacks.forEach(function(cb){
								cb(payload)
							})
							this.enqueue(payload.message)
							break
						case 'announce':
						default:
							break
					}

					// Expand awareness of the network.
					if (!!payload.friend) this.addPeer(payload.friend.hostname, payload.friend.port)

					// Finalise
					res.writeHead(200)
					res.end()
				} catch (e) {
					this.log('critical', e)
					res.writeHead(500)
					res.end()
				}
			}.bind(this))
		}.bind(this)).listen(options.port)

		// Start sending messages
		var sendInterval = setInterval(function() {
			if (!this.isEmpty()) {
				// Pick a peer
				var targetPeer = null
				var targetStatus = 'new'
				var keys = Object.keys(peers['new'])
				// Prioritise new peers
				if (keys.length > 0) {
					targetPeer = peers['new'][keys[keys.length * Math.random() << 0]]
				}
				// If there are no new peers, choose between the alive peers and retrying lost or dead ones
				else {					
					// Default to alive
					targetStatus = 'alive'
					keys = Object.keys(peers['alive'])
					var factor = Math.random()
					// Try lost peers randomly, or we have no alive peers
					if ((factor > 0.95 || keys.length == 0) && Object.keys(peers['lost']).length > 0) {
						targetStatus = 'lost'
						keys = Object.keys(peers['lost'])
					}
					// Try dead peers randomly, or we have no alive or lost peers
					if ((factor > 0.999 || keys.length == 0) && Object.keys(peers['dead']).length > 0) {
						targetStatus = 'dead'
						keys = Object.keys(peers['dead'])
					}
					// Pick random peer from the target list
					if (keys.length > 0) targetPeer = peers[targetStatus][keys[ keys.length * Math.random() << 0]]
				}
				// Send the message, with callback function on success
				var nextMessage = this.dequeue()
				if (!!targetPeer) send(
					nextMessage,
					targetPeer.hostname,
					targetPeer.port,
					'message',
					this,
					function(responseCode, responseData) {
						if (responseCode == '200') {
							// Update the peer
							this.update(targetPeer, 'alive')
						} else {
							this.log('network', [responseCode, responseData])
							// Update the peer - new or previously alive peers become "lost"
							if (targetPeer.status == 'alive' || targetPeer.status == 'new') {
								this.update(targetPeer, 'lost')
							}
							else if (targetPeer.status == 'lost' && Date.now() - targetPeer.time > options.killtimeout) {
								this.update(targetPeer, 'dead')
							}
							// Return failed message to the queue
							this.enqueue(nextMessage)
						}
					}.bind(this)
				)
			}
			else {
				// Todo - perhaps allow a peer with no messages to announce itself automatically?
			}
		}.bind(this), 1000 / options.sendrate)
	}


	// Helper to send messages to other peers
	function send(message, hostname, port, type, context, callback) {
		// Attach a random "friend" peer to the message to help the network grow.
		var keys = Object.keys(context.getPeers()['alive']),
			friend = context.getPeers()['alive'][keys[ keys.length * Math.random() << 0]]

		// Construct the payload
		var payload = {
			message: message,
			type: type,
			sender: {hostname: context.getOptions().hostname, port: context.getOptions().port}
		}
		if (!!friend) payload.friend = {
			hostname: friend.hostname,
			port: friend.port
		}		
		var data = JSON.stringify(payload)

		// set up  POST https options
		const options = {
			hostname: hostname,
			port: port,
			path: '/',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': data.length
			}
		}
		var responseData = []
		const req = https.request(options, function(res) {
			res.on('data', chunk => {
				// do nothing
				responseData.push(chunk)
			})
			res.on('end', () => {
				callback(res.statusCode, responseData.toString())
			})
		})

		req.on('error', function(error) {
			callback(error)
		})

		// Execute the HTTP request
		req.write(data)
		req.end()
	}

	try {
		init.bind(clacksInstance)(optionOverrides)
		return clacksInstance
	} catch (e) {
		clacksInstance.log('critical', e)
		return false
	}
}
