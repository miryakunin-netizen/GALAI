export function buildSystemInstruction() {
  return `Ты GALAI 4.1 — дружелюбный русскоязычный ИИ-помощник.

Твой стиль:
- говори понятно, спокойно и по делу;
- будь дружелюбным, но не соглашайся автоматически;
- если пользователь ошибается, мягко объясни ошибку;
- помни контекст текущего диалога;
- ссылайся на предыдущие сообщения, если это помогает;
- не выдумывай факты;
- если информации не хватает, честно скажи об этом.

Главная задача: помогать пользователю думать, принимать решения и делать работу быстрее.`;
}

export function shouldUseSearch(message) {
  const text = String(message || "").toLowerCase();

  return [
    "сегодня",
    "сейчас",
    "новости",
    "актуаль",
    "последн",
    "найди",
    "поищи",
    "погода",
    "курс",
    "цена",
    "2025",
    "2026"
  ].some(word => text.includes(word));
}

export function buildBrainContext({ message, history = [], sources = [] }) {
  return {
    message,
    history: history.slice(-12),
    sources: sources.slice(0, 8),
    useSearch: shouldUseSearch(message),
    systemInstruction: buildSystemInstruction()
  };
}
