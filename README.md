# What is Clacks?

Clacks is a peer to peer network messaging utility. There is no permanent data storage on any individual node; data only exists within the temporary message queue within an individual peer's memory, and on the network overhead as data is transmitted between peers.

The total data held within the network is a function of the average network latency multiplied by the number of messages sent per second (across all peers), plus the contents of the queues of each peer.

The system utilises three basic concepts to achieve this outcome:

1. Peers (aka Towers) send messages to each other from their queue. After the message is sent, it is deleted.
2. When a peer recieves a message, the message is added to the peers queue.
3. Messages only exist in volatile memory of a random peer, or are in transit.

# Basic Usage

**Starting a clacks tower**

    Clacks = import('clacks')
    tower = Clacks()
    tower.init(key, cert)

**Interacting with the local clacks tower**

    // Enqueue a message into the local queue, to be distributed into the network:
    tower.enqueue(message)
    
    // View the current contents of the local clacks tower's queue:
    messages = tower.peek()
    
    // View the current list of peer towers
    towers = tower.survey()
    
    // Add a remote tower to the local peer towers list
    tower.expand(hostname, port)
    
    // Announce this tower to a remote tower, and additionally add the remote tower to the local towers list
    tower.announce(hostname, port)

**Event listeners**

    // Message received:
    tower.onMessageReceived(function(payload){
      // do something with payload
    })

    // New remote tower discovered:
    tower.onTowerDiscovered(function(tower){
      // do something with tower
    })

    // Remote tower status updated:
    tower.onTowerUpdated(function(tower){
      // do something with tower
    })

# Init options

When calling **init()**, you can pass any of the following options (defaults listed):

    {
      hostname: 'localhost',
      port: 8080,
      sendrate: 1,
      killtimeout: 3600000
    }

**hostname**

The hostname that other peers can use to find the clacks tower. This is sent to other towers when announcing, or when messages are sent.

**port**

The port that the clacks tower will run on. This is sent to other towers when announcing, or when messages are sent.

**sendrate**

This determines how many messages a second the clacks node will attempt to send. Currently this works off a very rudimentary setInterval mechanism. In the future this will likely be changed to a byterate based system.

**killtimeout**

Time in microseconds after which a "lost" host becomes "dead".

# Testing

There are a number of basic test scripts in the **/test** folder. Refer to the **README.md** in the **/test** folder for further instruction on testing.

# Peer discovery

There are basic capabilities baked in to discover, reject, and heal peer connections.

* A new tower has no innate awareness or ability to discover any other peers as there is no central authority. Applications can concievably store local lists of hosts or fetch them from their own central repositories.
* Applications can explicitly add peer towers by calling the **expand(hostname, port)** or **announce(hostname, port)** functions.
* Every time a tower transmits a message to a peer tower, it includes a random "friend" - a known "active" peer. This is added to the local host's peer list as a "new" tower.

# Peer Statuses

Clacks towers can maintain a list of peer towers. Each of these peers has a status as follows:

* **new** - Any "new" towers added start in this state. When deciding which peers to message next, "new" peers always take first priority.
* **alive** - Any peers that the tower has had success communicating with are considered "alive". If there are no "new" peers, there is a 95% chance an "alive" peer will be chosen as the next message recipient.
* **lost** - Any peers that the tower has failed to communicate with are moved to the "lost" list. Until a configured kill timer is reached (default is 1 hour), there is a 4.999% chance that a "lost" peer will be chosen as the next message recipient.
* **dead** - Any peers that the tower has persistently failed to communicate are moved to the "dead" list. They will remain here indefinitely, with a 0.001% chance of being selected as a message recipient.
* **ignored** - Any messages from peer towers in the ignore list are rejected, as are announce attempts, and of course there will be no outbound attempts to contact ignored peers.

Worth noting about these statuses:

* "dead" and "lost" towers are reinstated to "alive" immediately upon a successful message transaction, whether as sender or recipient.
* Currently no mechanism is in place to automate the process of adding towers to the "ignored" list. I have not decided yet whether to leave this up to the client applications to decide on their own implementations.

# Message validation and filtering

* The intention is to keep this library agnostic from client application needs. As such there is no baked-in message validation or filtering.
* A raw clacks host will accept, enqueue, and forward any message from any source.
* More specialised client applications will be able to validate and filter inbound and outbound messages, and implement controls to ignore peers.
* Events will be added to give client applications the necessary tools to achieve this.

# Important next steps

* Expand event listeners to improve usability.
* Create proof of concept application(s)
* Broad scale testing to determine weaknesses and mitigations
* Publish as an npm package

# A small tribute

https://discworld.fandom.com/wiki/Clacks
