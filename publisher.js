const { v1 } = require("@google-cloud/pubsub");
const hl = require("highland");
const fs = require("fs");
const { GrpcClient } = require("google-gax");

const {
  projectId,
  inputTopicName,
  usePubSubEmulator,
  pubSubEmulatorPort
} = require("./config");
const { debounce } = require("lodash");

const log = debounce(hl.log, 250, { maxWait: 1000 });

const getPubClient = useEmulator => {
  if (useEmulator) {
    const { grpc } = new GrpcClient();
    return new v1.PublisherClient({
      servicePath: "localhost",
      port: pubSubEmulatorPort,
      sslCreds: grpc.credentials.createInsecure()
    });
  } else {
    return new v1.PublisherClient();
  }
};

(async () => {
  try {
    const exportFile = fs.createReadStream("./dataset.jsonl");
    const pubClient = getPubClient(usePubSubEmulator);
    const topic = pubClient.topicPath(projectId, inputTopicName);

    let messageCount = 0;

    try {
      await pubClient.createTopic({ name: topic });
    } catch (error) {
      console.log(error.toString());
    }

    hl(exportFile)
      .split()
      .compact()
      .map(row => ({ data: Buffer.from(row) }))
      .doto(() => {
        messageCount++;
        log(messageCount);
      })
      .batch(100)
      .flatMap(messages =>
        hl(
          pubClient.publish({
            topic,
            messages
          })
        )
      )
      .each(log)
      .done(() => {
        hl.log(`added ${messageCount} messages to ${topic}`);
      });
  } catch (error) {
    console.error(error);
  }
})();
