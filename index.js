var sha256 = require('crypto-js/sha256'),
	https = require('https')

module.exports = function(sslKey, sslCert) {
	// SSL certificate and key is mandatory
	if (!sslKey || !sslCert) throw 'Undefined HTTPS key and/or certificate.'

	// Generate and return the clacks server object
	return {
		/*
			Towers are other known clacks hosts. We keep track of their address,
			active status, and the time that status last updated.	


			Towers format:

			   	towers[status][addresshash] = {
					hostname: <string> (url)
					time:    <int>    (timestamp)
				}

			Status meanings:

				new:     Newly added, unknown actual status
				alive:   Was alive when last contacted
				lost:    Missing from network, might be temporary
				dead:    Missing from network, probably permanent
				ignored: Known tower to be ignored
		*/
		towers: {
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
		queue: [],
		/*
			Array of callbacks to be called when messages are received. [function callback(<payload>) {}]
		 */
		_onMessageRecievedCallbacks: [],
		/*
			Array of callbacks to be called when new towers are discovered [function callback(<tower>) {}]
		 */
		_onTowerDiscoveredCallbacks: [],
		/*
			Array of callbacks to be called when a tower is updated. [function callback(<tower>) {}]
		*/
		_onTowerUpdatedCallbacks: [],
		/*
			Array of callbacks to be called when a message is queued. [function callback(<message>) {}]
		*/
		_onMessageQueuedCallbacks: [],
		options: {
			// Send rate (messages per second)
			sendrate: 1,
			// Server port
			port: 8080,
			// server hostname (self reported)
			hostname: 'localhost',
			// timeout in ms after which lost towers are pronounced 'dead'
			killtimeout: 3600000
		},
		// Initialise this clacks host (options is optional)
		init: function(options) {			
			// Parse options - todo, make generic
			if (typeof options != 'undefined') {
				this.options.sendrate = options.sendrate || this.options.sendrate
				this.options.port = options.port || this.options.port
				this.options.hostname = options.hostname || this.options.hostname
			}

			// Start listening for messages
			var server = https.createServer({
				key: sslKey,
				cert: sslCert
			}, function(req, res) {
				// Assemble the received message data
				var data = []
				req.on('data', function(chunk) {
					data.push(chunk)
				}.bind(this))
				req.on('end', function() {
					var payload = JSON.parse(data),
						identifier = sha256(payload.sender.hostname + payload.sender.port).toString(),
						sourceTower = this.getTower(identifier)						
					// Reject payloads from ignore list
					if (!!sourceTower && sourceTower.status == 'ignored') {
						res.writeHead(403)
						res.end()
						return
					}
					// Todo - add some logic to validate payloads and add abusers to ignored list
					switch (payload.type) {
						case 'message':
							this._onMessageRecievedCallbacks.forEach(function(cb){
								cb(payload)
							})
							this.enqueue(payload.message)
							break
						case 'announce':
						default:
							break
					}
					// Expand and heal the network					
					if (!sourceTower) {
						this.expand(payload.sender.hostname, payload.sender.port)
					} else {
						this.update(sourceTower, 'alive')
					}										
					if (!!payload.friend) this.expand(payload.friend.hostname, payload.friend.port)
					// Finalise
					res.writeHead(200)
					res.end()
				}.bind(this))
			}.bind(this)).listen(this.options.port)

			// Start sending messages
			var sendInterval = setInterval(function() {
				if (!this.isEmpty()) {
					// Pick a tower
					var targetTower = null
					var targetStatus = 'new'
					var keys = Object.keys(this.towers['new'])
					// Prioritise new towers
					if (keys.length > 0) {
						targetTower = this.towers['new'][keys[0]]
					}
					// If there are no new towers, choose between the alive towers and retrying lost or dead ones
					else {					
						// Default to alive
						targetStatus = 'alive'
						keys = Object.keys(this.towers['alive'])
						var factor = Math.random()
						// Try lost towers randomly, or we have no alive towers
						if ((factor > 0.95 || keys.length == 0) && Object.keys(this.towers['lost']).length > 0) {
							targetStatus = 'lost'
							keys = Object.keys(this.towers['lost'])
						}
						// Try dead towers randomly, or we have no alive or lost towers
						if ((factor > 0.999 || keys.length == 0) && Object.keys(this.towers['dead']).length > 0) {
							targetStatus = 'dead'
							keys = Object.keys(this.towers['dead'])
						}
						// Pick random tower from the target list
						if (keys.length > 0) targetTower = this.towers[targetStatus][keys[ keys.length * Math.random() << 0]]
					}
					// Send the message, with callback function on success
					var nextMessage = this.dequeue()
					if (!!targetTower) send(
						nextMessage,
						targetTower.hostname,
						targetTower.port,
						'message',
						this,
						function(result) {
							if (result == '200') {
								// Update the tower
								this.update(targetTower, 'alive')
							} else {								
								// Update the tower - new or previously alive towers become "lost"
								if (targetTower.status == 'alive' || targetTower.status == 'new') {
									this.update(targetTower, 'lost')
								}
								else if (targetTower.status == 'lost' && Date.now() - targetTower.time > this.options.killtimeout) {
									this.update(targetTower, 'dead')
								}
								// Return failed message to the queue
								this.enqueue(nextMessage)
							}
						}.bind(this)
					)
				}
			}.bind(this), 1000 / this.options.sendrate)
		},
		// Add a new message to this towers message queue
		enqueue: function(message) {
			if (!!message) {
				this.queue.push(message)
				this._onMessageQueuedCallbacks.forEach(function(cb){
					cb(message)
				}.bind(this))
			}
		},
		// Remove and return a message from the head of the queue
		dequeue: function() {
			return this.queue.shift()
		},
		// Return the entire message queue
		peek: function() {
			return this.queue
		},
		// Returns true if the message queue is empty
		isEmpty: function() {
			return this.queue.length == 0
		},
		// Anounce our presence to another tower
		announce: function(hostname, port) {
			send(
				null,
				hostname,
				port,
				'announce',
				this,
				function(result) {
					if (result == '200') {
						// Update the tower
						this.expand(hostname, port)
					}
				}.bind(this)
			)
		},
		// Retrieve a tower by identifier, or null
		getTower: function(identifier) {
			if (this.towers['ignored'].hasOwnProperty(identifier)) return this.towers['ignored'][identifier]
			if (this.towers['alive'].hasOwnProperty(identifier)) return this.towers['alive'][identifier]
			if (this.towers['new'].hasOwnProperty(identifier)) return this.towers['new'][identifier]
			if (this.towers['dead'].hasOwnProperty(identifier)) return this.towers['dead'][identifier]
			if (this.towers['lost'].hasOwnProperty(identifier)) return this.towers['lost'][identifier]
		},
		// Add a new tower to the clacks network
		expand: function(hostname, port, status) {		

			var identifier = sha256(hostname+port).toString()
				targetStatus = status || 'new'

			// Don't add this actual tower to the list
			if (hostname == this.options.hostname && port == this.options.port) return

			// Don't add existing towers
			if (this.getTower(identifier)) return

			// Add the new tower
			this.towers[targetStatus][identifier] = {
				identifier: identifier,
				hostname: hostname,
				port: port,
				status: targetStatus,
				time: Date.now()
			}

			// Trigger new tower added event
			this._onTowerDiscoveredCallbacks.forEach(function(cb){
				cb(this.towers[targetStatus][identifier])
			}.bind(this))
		},
		// Updates a tower to specifed status
		update: function(tower, status) {
			// No need to update tower if status remains the same
			if (tower.status == status || tower.status == 'ignored') return
			// Remove tower from old status
			delete(this.towers[tower.status][tower.identifier])
			// Update tower status
			tower.status = status
			tower.time = Date.now()
			// Add tower to new status
			this.towers[tower.status][tower.identifier] = tower
			this._onTowerUpdatedCallbacks.forEach(function(cb){
				cb(this.towers[tower.status][tower.identifier])
			}.bind(this))
		},
		// Ignores a specified hostname and port
		ignore: function(hostname, port) {
			var identifier = sha256(hostname+port).toString(),
				tower = this.getTower(identifier)

			if (!!tower) {
				this.update(tower, 'ignored')
			} else {
				// Add the new tower directly to the ignored list
				this.expand(hostname, port, 'ignored')
			}
		},
		// Retrieve current known towers statuses
		survey: function() {
			return this.towers
		},
		// Register callback triggered after a message is received
		onMessageRecieved: function(callback) {
			this._onMessageRecievedCallbacks.push(callback)
		},
		// Register callback triggered after a new tower is discovered
		onTowerDiscovered: function(callback) {
			this._onTowerDiscoveredCallbacks.push(callback)
		},
		// Register callback triggered after a new tower is discovered
		onTowerUpdated: function(callback) {
			this._onTowerUpdatedCallbacks.push(callback)
		},
		// Register callback triggered after a new message is queued
		onMessageQueued: function(callback) {
			this._onMessageQueuedCallbacks.push(callback)
		},
	}

	// Helper to send messages to other towers
	function send(message, hostname, port, type, context, callback) {
		// Attach a random "friend" tower to the message to help the network grow.
		var keys = Object.keys(context.towers['alive']),
			friend = context.towers['alive'][keys[ keys.length * Math.random() << 0]]

		// Construct the payload
		const data = JSON.stringify({
			message: message,
			hostname: hostname,
			port: port,
			type: type,
			sender: {hostname: context.options.hostname, port: context.options.port},
			friend: friend
		})

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
		
		const req = https.request(options, function(res) {
			res.on('data', d => {
				// Do nothing - perhaps in the future we could return "friends" whenever a message is received.
			})
			res.on('end', () => {
				callback(res.statusCode)
			})
		})

		req.on('error', function(error) {
			callback(error)
		})

		// Execute the HTTP request
		req.write(data)
		req.end()
	}
}
