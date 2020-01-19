How to run:

setup correct credentials and change project in config.js start `node publisher.js` and in another terminal `node subscriber.js`

Noticed:

Noticed 583 000 messages in log (pubsub_dashboard.png) although file had 429 077 rows.

After keeping publisher.js alive I started to get these:
PUBLISHER:
(node:48110) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). (rejection id: 429070)
(node:48110) UnhandledPromiseRejectionWarning: Error: Retry total timeout exceeded before any response was received
at repeat (/Users/carlo/projects/faulty-google-pubsub/node_modules/google-gax/build/src/normalCalls/retries.js:80:31)
at Timeout.\_onTimeout (/Users/carlo/projects/faulty-google-pubsub/node_modules/google-gax/build/src/normalCalls/retries.js:115:25)
at listOnTimeout (internal/timers.js:531:17)
at processTimers (internal/timers.js:475:7)

Subscriber read 664 154 messages. So 50% increse.

export PUBSUB_EMULATOR_HOST=localhost:8085
