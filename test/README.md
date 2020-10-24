*Step 1: Run test.js*

* This sets up 3 clacks "peers" on localhost port 8001, 8002, and 8003 respectively.
* Only Peer 1 and 2 are explicitly aware of each other.
* Peer 1 enqueues a message into its message queue
* Peer 3 announces itself to Peer 1
* Peer 2 and Peer 3 should quickly learn of each others' existence through Peer 1's interactions with Peer 3

*Step 2: Run test2.js*

Note: keep test.js running in another console while you run test2.js.

* This sets up clacks peer #4 on port 8004
* Peer 4 announces itself to peer #1 (8001)
* As with the previous test, the remaining peers will eventually become aware of peer #4, and vice-versa
* Kill the test2.js process (make sure the 'Hello Discworld!' message is currently held by any of peers 1,2, or 3 before doing so)
* Observe that peers 1, 2 and 3 eventually announce that they have "lost" peer 4.

*Step 3: Run test3.js*

Note: keep test.js running in another console while you run test3.js.

* This sets up clacks peer #4 on port 8004
* Peer 4 **does not** announce itself. Instead, it will wait to see if peers 1-3 remember it.
* Eventually, one by one, peers 1-3 will reconnect with Peer 4

*Step 4: Run test-ignore.js*

Note: keep test.js and test3.js running in another console while you run test-ignore.js.

* This sets up clacks peer #5 on port 8005
* Peer 5 announces itself to Peer 1
* Peer 5 ignores Peer 2
* You should not observe any incoming messages being accepted from Peer 2

*Step 5: Run test-reverse.js*

Note: keep at least test.js running in another console while you run test-reverse.js.

* This sets up clacks peer #6 on port 8006
* Peer 6 announces itself to Peer 1
* Any time peer 6 recieves a message, it reverses the message string.
