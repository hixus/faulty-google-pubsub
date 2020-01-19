const { v1 } = require("@google-cloud/pubsub");
const hl = require("highland");
const { debounce } = require("lodash");
const { GrpcClient, Status } = require("google-gax");

const {
  projectId,
  inputTopicName,
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
    const subClient = getSubClient(usePubSubEmulator);

    const formattedName = subClient.subscriptionPath(
      projectId,
      inputSubscriptionName
    );
    const formattedTopic = subClient.topicPath(projectId, inputTopicName);
    try {
      await subClient.createSubscription({
        name: formattedName,
        topic: formattedTopic,
        ackDeadlineSeconds: 600
      });
    } catch (error) {
      console.log(error.toString());
    }
    let readMessageCount = 0;

    const request = {
      subscription: formattedName,
      maxMessages: 100,
      returnImmediately: false
    };

    hl(async (push, next) => {
      try {
        const [response] = await subClient.pull(request);
        if (response.receivedMessages.length > 0) {
          await subClient.acknowledge({
            subscription: formattedName,
            ackIds: response.receivedMessages.map(msg => msg.ackId)
          });
          response.receivedMessages.forEach(msg => push(null, msg.data));
          next();
        } else {
          setTimeout(() => {
            next();
          }, 10);
        }
      } catch (error) {
        if (error.code == Status.DEADLINE_EXCEEDED) {
          console.log("deadline exeededeee");
          next();
        } else {
          throw error;
        }
      }
    }).each(() => {
      ++readMessageCount;
      log(`read ${readMessageCount} messages`);
    });
  } catch (error) {
    console.error(error);
  }
})();
