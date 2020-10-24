# What is clacks-p2p?

This repository contains a nodejs implementation of the clacks p2p system. It is a low-level package with only the most basic message passing and discovery logic built-in.

Applications can build whatever desired behaviours they like on top of it (see [Application Ideas](#application-ideas) below for some conceptual use-cases).

# What is Clacks?

Clacks is a peer-to-peer network messaging system. There is no permanent data storage on any individual node; data only exists within the temporary message queue within an individual peer's memory, and on the network overhead as data is transmitted between peers.

![Message Flow Illustration](https://raw.githubusercontent.com/AlexanderParker/clacks/main/assets/docs-msg-illustration.png)

The system utilises two basic concepts to achieve this outcome:

1. Peers send messages to each other from their queue. After the message is sent, it is deleted.
2. When a peer recieves a message, the message is added to the peers queue, and the process repeats indefinitely.

The total data held within the network for any given second is a function of the average network latency between all peers multiplied by the number of messages sent per second (across all peers), plus the contents of the queues of each peer.

# Basic Usage

Assuming you have a nodejs development environment already, getting started with clacks is quite simple.

**Installing**

    > npm install clacks-p2p

Also, you will need to have an SSL certificate and key handy. You can generate a self-signed one for testing (check out the **/test** folder and code for example)

**Starting a clacks node instance**

    Clacks = require('clacks-p2p')
    clacksInstance = new Clacks(key, cert)
    clacksInstance.init(options)

**Interacting with the local clacks node**

    // Enqueue a message into the local queue, to be distributed into the network:
    clacksInstance.enqueue(message)
    
    // View the current contents of the local node's queue:
    messages = clacksInstance.peek()
    
    // View the current list of peers
    peers = clacksInstance.survey()
    
    // Add a remote peer directly to the clacks instance's peer list
    clacksInstance.expand(hostname, port)
    
    // Announce this instance to a peer, and additionally add the peer to the local peers list
    clacksInstance.announce(hostname, port)

    // Ignore a specified peer by hostname and port
    clacksInstance.ignore(hostname, port)

**Event listeners**

    // After message received (before it is queued):
    clacksInstance.onMessageReceived(function(payload){
      // do something with payload
      // Setting payload.message to null, false, or undefined will prevent it from being added to the local queue.
    })

    // After a message is queued:
    clacksInstance.onMessageQueued(function(message){
      // do something with message
    })

    // New peer discovered:
    clacksInstance.onPeerDiscovered(function(peer){
      // do something with peer
    })

    // Peer status updated:
    clacksInstance.onPeerUpdated(function(peer){
      // do something with peer
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

The hostname that other peers can use to find the clacks instance. This is sent to other peers when announcing, or when messages are sent.

**port**

The port that the clacks instance will run on. This is sent to other peers when announcing, or when messages are sent.

**sendrate**

This determines how many messages a second the clacks node will attempt to send. Currently this works off a very rudimentary setInterval mechanism. In the future this will likely be changed to a byterate based system.

**killtimeout**

Time in microseconds after which a "lost" host becomes "dead".

# Message Payload

Message payloads are passed between peers in the following basic format:

    {
      message: <MIXED>,
      type: <STRING["message"|"announce"]>,
      sender: {
        hostname: <STRING>,
        port: <STRING|INT>
      },
      friend: {
        hostname: <STRING>,
        port: <STRING|INT>
      }
    }

**message**

The message can be any data to be sent between peers.

**type**

Either "message" or "announce". If it's an "announce" type, then message contents are  ignored.

**sender**

Hostname and port of the origin of the message.

**friend**

Hostname and port of a randomly chosen "alive" peer from the sender's peer list. This is used to grow the network organically.

# Testing

There are a number of basic test scripts in the **/test** folder. Refer to the **README.md** in the **/test** folder for further instruction on testing.

# Peer discovery

There are basic capabilities baked in to discover, reject, and heal peer connections.

* A new node has no innate awareness or ability to discover any other peers as there is no central authority. Applications can concievably store local lists of hosts or fetch them from their own central repositories.
* Applications can explicitly add peers by calling the **expand(hostname, port)** or **announce(hostname, port)** functions.
* Every time a node transmits a message to a peer, it includes a random "friend" - a known "active" peer. This is added to the local host's peer list in the "new" status.

# Peer Statuses

Clacks nodes maintain a list of peers. Each of these peers has a status as follows:

* **new** - Any "new" peers added start in this state. When deciding which peers to message next, "new" peers always take first priority.
* **alive** - Any peers that the node has had success communicating with are considered "alive". If there are no "new" peers, there is a 95% chance an "alive" peer will be chosen as the next message recipient.
* **lost** - Any peers that the node has failed to communicate with are moved to the "lost" list. Until a configured kill timer is reached (default is 1 hour), there is a 4.999% chance that a "lost" peer will be chosen as the next message recipient.
* **dead** - Any peers that the node has persistently failed to communicate are moved to the "dead" list. They will remain here indefinitely, with a 0.001% chance of being selected as a message recipient.
* **ignored** - Any messages from peers in the ignore list are rejected, as are announce attempts, and of course there will be no outbound attempts to contact ignored peers.

*Note: "dead" and "lost" peers are reinstated to "alive" immediately upon a successful message transaction, whether as sender or recipient.*

# Message validation and filtering

* The intention is to keep this library agnostic from client application needs. As such there is no baked-in message validation or filtering.
* A raw clacks host will accept, enqueue, and forward any message from any source.
* More specialised client applications will be able to validate and filter inbound and outbound messages, and implement controls to ignore peers.
* Events may be added as needed to give client applications the necessary tools to achieve this.

# General to-do list

* Broad scale testing to determine weaknesses and mitigations
* Bulk test large numbers of clacks peers to profile message propagation dynamics
* Create proof of concept application(s)

# Application ideas

* Tuning in: An application specifies a particular message format which includes a way of tagging or categorising messages. Users can set up a clacks node and if any messages match their personal filters, these can be aggregated into a local list or collection, like tuning into a radio station.
* Filtering: An application can decide which types of messages it wants to forward or reject, and ignore peers that don't meet their specific criteria.
* Transforming: An application could aggregate, embellish, transform and retransmit messages, perhaps enabling interoperability between different types of consumer and broadcast applications on the network.
* Bifurcating: An application could split individual messages into multiple sub-messages, or recombine sub-messages.
* Archiving: An application could archive any or all messages it touches.
* Persisting: An application, possibly based on an archival system, could reintroduce messages that it hasn't seen in a while, to provide persistance and robustness to the entire network.
* Stonewalling: A filtering application could deliberately accept then refuse to retransmit messages, effectively deleting that piece of data from the network if it is not otherwise archived or persisted.
* Corrupting: A transforming application could deliberately modify messages prior to retransmital in a way that interferes with or undermines the original purpose of the message.
* Flooding: A flooding application could deliberately rebroadcast a selection of messages many times, to overload message queues for whatever purpose.
* Crawling: A crawling application could craft messages that contain a growing list of known peers and use these messages to expand awareness of the full network.
* Hybrid: A hybrid clacks application would combine base concepts, such as tuning in, filtering, transforming, bifurcating, archiving, persisting, stonewalling, corrupting, flooding and crawling, to achieve its purposes.

# A small tribute

https://discworld.fandom.com/wiki/Clacks
