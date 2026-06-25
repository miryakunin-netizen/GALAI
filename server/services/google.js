const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

export async function googleSearch(query) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    throw new Error("GOOGLE_API_KEY or GOOGLE_CX is missing");
  }

  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    cx: GOOGLE_CX,
    q: query,
    num: "5"
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Google Search API error");
  }

  return (data.items || []).map((item) => ({
    title: item.title,
    snippet: item.snippet,
    link: item.link,
    displayLink: item.displayLink
  }));
}