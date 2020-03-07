# FB Messenger Chatbot

A chatbot to make selling used items a little easier.

```json
{
  "listings": {
    "listing1": {
      "seller": "user1",
      "has_queue": true,
      "queue": ["user2"],
      "faq": [],
      "price": 100
    }
  },
  "messages": {
    "m1": {
      "user": "user2",
      "text": "Is this still available?",
      "timestamp": 71231231241,
      "room": "room1"
    }
  },
  "rooms": {
    "room1": {
      "is_active": true,
      "listing": "listing1",
      "members": ["user1", "user2"],
      "messages": ["m1"]
    }
  },
  "users": {
    "user1": {
      "listings_sale": ["listing1", "listing2"],
      "listings_buy": []
    },
    "user2": {
      "listings_sale": ["listing3"],
      "listings_buy": ["listing1"]
    }
  }
}
```
