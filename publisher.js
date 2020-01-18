const { PubSub } = require("@google-cloud/pubsub");
const hl = require("highland");
const fs = require("fs");
const {
  projectId,
  inputTopicName,
  inputSubscriptionName
} = require("./config");
const { debounce } = require("lodash");

const log = debounce(hl.log, 250, { maxWait: 1000 });

(async () => {
  try {
    const exportFile = fs.createReadStream("./dataset.jsonl");
    let messageCount = 0;
    const pubsub = new PubSub({ projectId });
    try {
      await pubsub.createTopic(inputTopicName);
      await pubsub.createSubscription(inputTopicName, inputSubscriptionName, {
        ackDeadlineSeconds: 600
      });
    } catch (error) {
      console.log(error.toString());
    }

    const inputTopic = pubsub.topic(inputTopicName);

    hl(exportFile)
      .split()
      .compact()
      .map(Buffer.from)
      .doto(() => {
        messageCount++;
        log(messageCount);
      })
      .each(row => inputTopic.publish(row))
      .done(() => {
        hl.log(`added ${messageCount} messages to ${inputTopic.name}`);
      });
  } catch (error) {
    console.error(error);
  }
})();
