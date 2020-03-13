const state = {
  CATEGORIZE: "categorize",
  CHATTING: "chatting",
  FAQ_SETUP: "faq-setup",
  FAQ_DONE: "faq-done"
};

const context = {};

function getContext(id) {
  return context[id];
}

function setContext(id, state, data) {
  context[id] = { state, data };
}

function removeContext(id) {
  delete context[id];
}

module.exports = { getContext, setContext, removeContext, state };
