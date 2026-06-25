import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is missing");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

export async function askGeminiWithSearch(...)
  const sourcesText = searchResults
    .map((item, index) => {
      return `[${index + 1}] ${item.title}
${item.snippet}
${item.link}`;
    })
    .join("\n\n");

  const prompt = `
Ты GALAI — умный ИИ-ассистент.

Ответь пользователю на русском языке.
Используй результаты интернет-поиска ниже, если они полезны.
Не выдумывай источники.
В конце ответа добавь раздел "Источники" со ссылками.

Вопрос пользователя:
${userMessage}

Результаты поиска:
${sourcesText || "Нет результатов поиска."}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;

  return response.text();
}

module.exports = {
  askGeminiWithSearch
};
