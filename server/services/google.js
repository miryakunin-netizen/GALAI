const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

async function googleSearch(query) {
    const url =
        `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}` +
        `&cx=${GOOGLE_CX}` +
        `&q=${encodeURIComponent(query)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.items || []).map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link
    }));
}

export { googleSearch };