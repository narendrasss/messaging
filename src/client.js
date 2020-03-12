const Messenger = require("messenger-node");

const client = new Messenger.Client({
  page_token: process.env.PAGE_ACCESS_TOKEN
});

client.setMessengerProfile({
  get_started: {
    payload: "get-started"
  }
});

module.exports = {
  client
};
