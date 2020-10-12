var sha256 = require('crypto-js/sha256'),
	http = require('http')

function send(message, hostname, port, type, context, callback) {
	// Attach a random "friend" station to the message to help the network grow.
	var keys = Object.keys(context.stations['alive']),
		friend = context.stations['alive'][keys[ keys.length * Math.random() << 0]]

	// Construct the payload
	const data = JSON.stringify({
		message: message,
		hostname: hostname,
		port: port,
		type: type,
		sender: {hostname: context.options.hostname, port: context.options.port},
		friend: friend
	})

	// set up  POST http options
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
	
	const req = http.request(options, res => {
		res.on('data', d => {
			// Do nothing - perhaps in the future we could return "friends" whenever a message is recieved.
		})
		res.on('end', () => {
			callback(res.statusCode);
		});
	})

	req.on('error', error => {
		callback(error);
	})

	// Execute the HTTP request
	req.write(data)
	req.end()
}

module.exports = function() {
	return {
		/*
			Stations are other known clacks hosts. We keep track of their address,
			active status, and the time that status last updated.	


			Stations format:

			   	stations[status][addresshash] = {
					hostname: <string> (url)
					time:    <int>    (timestamp)
				}

			Status meanings:

				new:     Newly added, unknown actual status
				alive:   Was alive when last contacted
				lost:    Missing from network, might be temporary
				dead:    Missing from network, probably permanent
				ignored: Known station to be ignored
		*/
		stations: {
			new: {},
			alive: {},
			lost: {},
			dead: {},
			ignored: {}
		},

		/*
			The queue contains messages to broadcast.

			Items the host recieves are enqueued, items that are sent are dequeued.

			Items may also be manually queued.
		*/
		queue: [],
		/*
			Array of callbacks to be called when messages are recieved. [function callback(<payload>) {}]
		 */
		_onMessageRecievedCallbacks: [],
		/*
			Array of callbacks to be called when new stations are discovered [function callback(<station) {}]
		 */
		_onStationDiscoveredCallbacks: [],
		/*
			Array of callbacks to be called when a station is updated. [function callback(<station) {}]
		*/			
		_onStationUpdatedCallbacks: [],
		options: {
			// Send rate (messages per second)
			sendrate: 1,
			// Server port
			port: 8080,
			// server hostname (self reported)
			hostname: 'localhost',
			// timeout in ms after which lost stations are pronounced 'dead'
			killtimeout: 3600000
		},
		// Initialise this clacks host
		init: function(options) {
			// Parse options - todo, make generic
			if (typeof options != 'undefined') {
				this.options.sendrate = options.sendrate || this.options.sendrate
				this.options.port = options.port || this.options.port
				this.options.hostname = options.hostname || this.options.hostname
			}

			// Start listening for messages
			var server = http.createServer(function(req,res) {
				// todo : ignore servers on ignore list, or that report false hostname
				// if hostname:port not responsive, add to ignore list
				// if hostname:port are on ignore list, reject

				// Assemble the posted message data
				var data = []
				req.on('data', function(chunk) {
					data.push(chunk)
				}.bind(this))
				req.on('end', function() {
					var payload = JSON.parse(data)					
					var sourceStation = this.getStation(sha256(payload.sender.hostname + payload.sender.port).toString());
					// Reject payloads from ignore list
					if (!!sourceStation && sourceStation.status == 'ignore') return
					// Todo - add some logic to validate payloads and add abusers to ignore list
					switch (payload.type) {
						case 'message':
							this.enqueue(payload.message)
							this._onMessageRecievedCallbacks.forEach(function(cb){
								cb(payload)
							})
							break
						case 'announce':
						default:
							break
					}
					// Expand and heal the network					
					if (!sourceStation) {
						this.expand(payload.sender.hostname, payload.sender.port)
					} else {
						this.update(station, 'alive')
					}										
					if (!!payload.friend) this.expand(payload.friend.hostname, payload.friend.port)
					res.writeHead(200)
					res.end()
				}.bind(this))
			}.bind(this)).listen(this.options.port)

			// Start sending messages
			var sendInterval = setInterval(function() {
				if (!this.isEmpty()) {
					// Pick a station
					var targetStation = null
					var targetStatus = 'new'
					var keys = Object.keys(this.stations['new'])
					// Prioritise new stations
					if (keys.length > 0) {
						targetStation = this.stations['new'][keys[0]]
					}
					// If there are no new stations, choose between the alive stations and retrying lost or dead ones
					else {					
						// Default to alive
						targetStatus = 'alive'
						keys = Object.keys(this.stations['alive'])
						var factor = Math.random()
						// Try lost stations randomly, or we have no alive stations
						if ((factor > 0.95 || keys.length == 0) && Object.keys(this.stations['lost']).length > 0) {
							targetStatus = 'lost'
							keys = Object.keys(this.stations['lost'])
						}
						// Try dead stations randomly, or we have no alive or lost stations
						if ((factor > 0.999 || keys.length == 0) && Object.keys(this.stations['dead']).length > 0) {
							targetStatus = 'dead'
							keys = Object.keys(this.stations['dead'])
						}
						// Pick random station from the target list
						if (keys.length > 0) targetStation = this.stations[targetStatus][keys[ keys.length * Math.random() << 0]]
					}
					// Send the message, with callback function on success
					var nextMessage = this.dequeue()
					if (!!targetStation) send(
						nextMessage,
						targetStation.hostname,
						targetStation.port,
						'message',
						this,
						function(result) {
							if (result == '200') {
								// Update the station
								this.update(targetStation, 'alive')
							} else {
								// Update the station - new or previously alive stations become "lost"
								if (targetStation.status == 'alive' || targetStation.status == 'new') {
									this.update(targetStation, 'lost')
								}
								else if (targetStation.status == 'lost' && Date.now() - targetStation.time > this.options.killtimeout) {
									this.update(targetStation, 'dead')
								}
								// Return failed message to the queue
								this.enqueue(nextMessage)
							}
						}.bind(this)
					);
				}
			}.bind(this), 1000 / this.options.sendrate);
		},
		// Add a new message to this stations message queue
		enqueue: function(message) {
			this.queue.push(message)
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
		// Anounce our presence to another station
		announce: function(hostname, port) {
			send(
				null,
				hostname,
				port,
				'announce',
				this,
				function(result) {
					if (result == '200') {
						// Update the station
						this.expand(hostname, port)
					}
				}.bind(this)
			);
		},
		// Retrieve a station by identifier, or null
		getStation: function(identifier) {
			if (this.stations['ignored'].hasOwnProperty(identifier)) return this.stations['ignored'][identifier]
			if (this.stations['alive'].hasOwnProperty(identifier)) return this.stations['ignored'][identifier]
			if (this.stations['new'].hasOwnProperty(identifier)) return this.stations['ignored'][identifier]
			if (this.stations['dead'].hasOwnProperty(identifier)) return this.stations['ignored'][identifier]
			if (this.stations['lost'].hasOwnProperty(identifier)) return this.stations['ignored'][identifier]
		},
		// Add a new station to the clacks network
		expand: function(hostname, port) {
			var identifier = sha256(hostname+port).toString();

			// Don't add this actual station to the list
			if (hostname == this.options.hostname && port == this.options.port) return;

			// Don't add existing stations
			if (this.stations['ignored'].hasOwnProperty(identifier)
				|| this.stations['alive'].hasOwnProperty(identifier)
				|| this.stations['new'].hasOwnProperty(identifier)
				|| this.stations['dead'].hasOwnProperty(identifier)
				|| this.stations['lost'].hasOwnProperty(identifier)) return

			// Add the new station
			this.stations['new'][identifier] = {
				identifier: identifier,
				hostname: hostname,
				port: port,
				status: 'new',
				time: Date.now()
			}

			// Trigger new station added event
			this._onStationDiscoveredCallbacks.forEach(function(cb){
				cb(this.stations['new'][identifier])
			}.bind(this))
		},
		// Updates a station to specifed status
		update: function(station, status) {
			// No need to update station if status remains the same
			if (station.status == status) return
			// Remove station from old status
			delete(this.stations[station.status][station.identifier])
			// Update station status
			station.status = status
			station.time = Date.now()
			// Add station to new status
			this.stations[station.status][station.identifier] = station
			this._onStationUpdatedCallbacks.forEach(function(cb){
				cb(this.stations[station.status][station.identifier])
			}.bind(this))
		},
		// Retrieve current known stations statuses
		survey: function() {
			return this.stations
		},
		// Register callback triggered after a message is recieved
		onMessageRecieved: function(callback) {
			this._onMessageRecievedCallbacks.push(callback)
		},
		// Register callback triggered after a new station is discovered
		onStationDiscovered: function(callback) {
			this._onStationDiscoveredCallbacks.push(callback)
		},
		// Register callback triggered after a new station is discovered
		onStationUpdated: function(callback) {
			this._onStationUpdatedCallbacks.push(callback)
		},
	}
}
