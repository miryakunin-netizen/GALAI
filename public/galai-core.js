window.GalaiCore = {
  version: "4.1.0",

  memory: {
    short: [],
    facts: []
  },

  shouldUseSearch(message) {
    const text = String(message || "").toLowerCase();

    return [
      "сегодня",
      "сейчас",
      "новости",
      "найди",
      "поищи",
      "погода",
      "курс",
      "цена"
    ].some(word => text.includes(word));
  },

  remember(role, text) {
    this.memory.short.push({
      role,
      text,
      time: Date.now()
    });

    if (this.memory.short.length > 20) {
      this.memory.short.shift();
    }
  },

  getHistory(chatHistory = []) {
    return [
      ...chatHistory,
      ...this.memory.short
    ];
  },

  async ask(message, history = []) {

    this.remember("user", message);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        history: this.getHistory(history),
        useSearch: this.shouldUseSearch(message)
      })
    });

    const data = await response.json();

    if (data.answer) {
      this.remember("assistant", data.answer);
    }

    return data;
  }
};
