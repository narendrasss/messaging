const { Machine, interpret } = require("xstate");

const buyerMachine = Machine({
  id: "buyer-flow",
  initial: "accept-price",
  context: {
    currentState: "accept-price"
  },
  states: {
    "accept-price": {
      on: {
        OFFER: "wait"
      },
      wait: {
        on: { COUNTER_OFFER: "accept-price" }
      }
    }
  }
});

// TODO: find better way to retrieve and update state from service
const buyerService = interpret(buyerMachine)
  .onTransition(state => (buyerMachine.context.currentState = state.value))
  .start();

module.exports = { buyerService };
