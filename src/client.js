const Messenger = require("messenger-node");

const client = new Messenger.Client({
  page_token: process.env.PAGE_ACCESS_TOKEN
});

client.setMessengerProfile({
  get_started: {
    payload: "get-started"
  }
});

async function quickReplies(recipient, replies, text) {
  try {
    await client.sendQuickReplies(recipient, replies, text);
  } catch (err) {
    console.error(err);
  }
}

async function template(recipient, template) {
  try {
    await client.sendTemplate(recipient, template);
  } catch (err) {
    console.error(err);
  }
}

async function text(recipient, text) {
  try {
    await client.sendText(recipient, text);
  } catch (err) {
    console.error(err);
  }
}

async function getUserProfile(recipient, props) {
  try {
    return client.getUserProfile(recipient.id, props);
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  client,
  getUserProfile,
  send: {
    quickReplies,
    template,
    text
  }
};
