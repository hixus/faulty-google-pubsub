const { v1 } = require("@google-cloud/pubsub");
const hl = require("highland");
const { debounce } = require("lodash");
const { GrpcClient } = require("google-gax");

const {
  projectId,
  inputSubscriptionName,
  usePubSubEmulator,
  pubSubEmulatorPort
} = require("./config");

const log = debounce(hl.log, 250, { maxWait: 1000 });

const getSubClient = useEmulator => {
  if (useEmulator) {
    const { grpc } = new GrpcClient();
    return new v1.SubscriberClient({
      servicePath: "localhost",
      port: pubSubEmulatorPort,
      sslCreds: grpc.credentials.createInsecure()
    });
  } else {
    return new v1.SubscriberClient();
  }
};

(async () => {
  try {
    const subscription = `projects/${projectId}/subscriptions/${inputSubscriptionName}`;
    const subClient = getSubClient(usePubSubEmulator);
    let readMessageCount = 0;

    const request = {
      subscription,
      maxMessages: 100
    };

    hl(async (push, next) => {
      const [response] = await subClient.pull(request);
      if (response.receivedMessages.length > 0) {
        await subClient.acknowledge({
          subscription: `projects/${projectId}/subscriptions/${inputSubscriptionName}`,
          ackIds: response.receivedMessages.map(msg => msg.ackId)
        });
        response.receivedMessages.forEach(msg => push(null, msg.data));
      }
      next();
    }).each(() => {
      ++readMessageCount;
      log(`read ${readMessageCount} messages`);
    });
  } catch (error) {
    console.error(error);
  }
})();
