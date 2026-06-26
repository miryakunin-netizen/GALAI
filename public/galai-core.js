export const GalaiCore = {
  shouldUseSearch(message) {
    const text = String(message || "").toLowerCase();

    const triggers = [
      "сегодня",
      "сейчас",
      "новости",
      "актуаль",
      "последн",
      "что такое",
      "кто такой",
      "кто такая",
      "найди",
      "поищи",
      "цена",
      "курс",
      "погода",
      "2025",
      "2026"
    ];

    return triggers.some((word) => text.includes(word));
  },

  buildPayload({ message, history = [] }) {
    return {
      message,
      history,
      useSearch: this.shouldUseSearch(message)
    };
  },

  async ask({ message, history = [] }) {
    const payload = this.buildPayload({ message, history });

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Ошибка GALAI Core");
    }

    return data;
  }
};
