# What is Clacks?

Clacks is a peer to peer network messaging utility.

It's purpose is to store data in the network latency "overhead" - effectively there is no permanent local storage, outside of the temporary message queue that only resides in an individual peer's memory.

The system utilises three basic concepts to achieve this outcome:

1. Peers (aka Towers) send messages to each other from their queue. After the message is sent, it is deleted.
2. When a peer recieves a message, the message is added to the peers queue.
3. Messages only exist in volatile memory of a random peer, or are in transit.

If you consider the entire network as one big storage device, the total data held within the network is a function of the average network latency multiplied by the number of peers.

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

# Is it production-ready?

Not yet.

You can download this repository and run the test scripts per the testing steps below if you'd like a better idea of how it works.

It's not production ready at this stage. It's an experimental approach that could definitely use lots of testing and pull requests.

I think it has potential for some interesting niche applications, so I'd welcome any help hardening it.

# Testing

There are a number of basic test scripts in the /tests folder. Refer to the README.md in the /tests folder for further instruction on testing.

# P2P Statuses

Clacks towers can maintain a list of peer towers. Each of these peers has a status as follows:

* **new** - Any "new" towers added start in this state. When deciding which peers to message next, "new" peers always take first priority.
* **alive** - Any peers that the tower has had success communicating with are considered "alive". If there are no "new" peers, there is a 95% chance an "alive" peer will be chosen as the next message recipient.
* **lost** - Any peers that the tower has failed to communicate with are moved to the "lost" list. Until a configured kill timer is reached (default is 1 hour), there is a 4.999% chance that a "lost" peer will be chosen as the next message recipient.
* **dead** - Any peers that the tower has persistently failed to communicate are moved to the "dead" list. They will remain here indefinitely, with a 0.001% chance of being selected as a message recipient.
* **ignored** - Any messages from peer towers in the ignore list are rejected, as are announce attempts, and of course there will be no outbound attempts to contact ignored peers.

Worth noting about these statuses:

* "dead" and "lost" towers are reinstated to "alive" immediately upon a successful message transaction, whether as sender or recipient.
* Currently no mechanism is in place to automate the process of adding towers to the "ignored" list. I have not decided yet whether to leave this up to the client applications to decide on their own implementations.

# Peer discovery

There are basic capabilities baked in to discover, reject and heal peer connections, which can be expanded in the future.

* A new tower has no innate awareness or ability to discover any other peers as there is no central authority.
* Towers must be explicitly be told the hostname and port of at least one other peer.
* Every time a tower transmits a message to a peer tower, it includes a random "friend" - a known "active" peer.

# Message validation and filtering

* The intention is to keep this library agnostic from client application needs. As such there is no baked-in message validation or filtering.
* A raw clacks host will accept, enqueue, and forward any message from any source.
* More specialised client applications will be able to validate and filter inbound and outbound messages, and implement controls to ignore peers.
* Events will be added to give client applications the necessary tools to achieve this.

# Fun toy. Any applications?

Definitely. An application could use these simple mechanisms and introduce measures to combat flooding, netsplits, and interference to create a global ephemeral storage network, where data does not reside in any one specific location but instead is constantly alive "overhead".

Carefully crafted message formats using multiple layers of strong key-pair encryption - for instance a layer for the message itself, and another layer that packages messages between peers, would allow users to release data anonymously into the clacks, and later retrieve it from any access point. As there is no central server, and as all messages bouncing between peers would be similarly encrypted, it would be hard to discern where any one piece of information was first introduced, or who (if anyone) ever accessed it.

Large files can be broken into multiple messages, and resequenced as they're plucked from overhead at any other point in the network, assuming the client is able to determine the correct sequence and contents of the file (e.g. has the necessary keys to identify it as relevant to them).

# Important next steps

* Create proof of concept application
* Broad scale testing to determine weaknesses and mitigations
* Publish as an npm package

# A small tribute

https://discworld.fandom.com/wiki/Clacks
