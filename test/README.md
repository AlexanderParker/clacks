*Step 1: Run test.js*

* This sets up 3 clacks "towers" on localhost port 8001, 8002, and 8003 respectively.
* Only Tower 1 and 2 are explicitly aware of each other.
* Tower 1 enqueues a message into its message queue
* Tower 3 announces itself to Tower 1
* Tower 2 and Tower 3 should quickly learn of each others' existence through Tower 1's interactions with Tower 3

*Step 2: Run test2.js*

Note: keep test.js running in another console while you run test2.js.

* This sets up clacks tower #4 on port 8004
* Tower 4 announces itself to tower #1 (8001)
* As with the previous test, the remaining towers will eventually become aware of tower #4, and vice-versa
* Kill the test2.js process (make sure the 'Hello Discworld!' message is currently held by any of towers 1,2, or 3 before doing so)
* Observe that towers 1, 2 and 3 eventually announce that they have "lost" tower 4.

*Step 3: Run test3.js*

Note: keep test.js running in another console while you run test3.js.

* This sets up clacks tower #4 on port 8004
* Tower 4 **does not** announce itself. Instead, it will wait to see if towers 1-3 remember it.
* Eventually, one by one, towers 1-3 will reconnect with Tower 4

*Step 4: Run test-ignore.js*

Note: keep test.js and test3.js running in another console while you run test-ignore.js.

* This sets up clacks tower #5 on port 8005
* Tower 5 announces itself to Tower 1
* Tower 5 ignores Tower 2
* You should not observe any incoming messages being accepted from Tower 2

*Step 5: Run test-reverse.js*

Note: keep at least test.js running in another console while you run test-reverse.js.

* This sets up clacks tower #6 on port 8006
* Tower 6 announces itself to Tower 1
* Any time tower 6 recieves a message, it reverses the message string.
