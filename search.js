export async function searchWeb(query){
  const r = await fetch('/api/search?q=' + encodeURIComponent(query));
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Ошибка поиска');
  const items = data.items || [];
  if (!items.length) return `Я не нашёл результатов по запросу: ${query}`;
  return `🌐 Поиск (${data.source || 'web'}):\n\n` + items.slice(0,7).map((it,i)=>{
    const link = it.link ? `\n${it.link}` : '';
    return `${i+1}. ${it.title || 'Без названия'}\n${it.snippet || ''}${link}`;
  }).join('\n\n');
}

export async function localReply(text){
  const q = text.toLowerCase().trim();
  if (/привет|hello|здравствуй/.test(q)) return 'Привет! Я GALAI. Могу отвечать, искать информацию, помогать с кодом и идеями.';
  if (/кто ты|что ты/.test(q)) return 'Я GALAI — твой личный ИИ-ассистент с чатами, поиском и голосовым режимом.';
  if (/погод|температур/.test(q)) return weatherReply(text);
  if (/код|html|javascript|js|css|программ/.test(q)) return 'Опиши задачу подробнее — я помогу написать или исправить код. Для свежей информации включи кнопку 🌐 Поиск.';
  return 'Я понял. Можешь уточнить задачу или включить 🌐 Поиск, если нужен ответ из интернета.';
}

async function weatherReply(text){
  const m = text.match(/(?:погода|температура).*?(?:в|in)\s+([а-яёa-z\-\s]+)/i);
  const city = (m && m[1] ? m[1].trim() : 'Москва');
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`).then(r=>r.json());
    if (!geo.results?.length) return `Не нашёл город: ${city}`;
    const g = geo.results[0];
    const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,apparent_temperature,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`).then(r=>r.json());
    return `🌤 Погода: ${g.name}, ${g.country || ''}\nСейчас: ${Math.round(w.current.temperature_2m)}°C\nОщущается: ${Math.round(w.current.apparent_temperature)}°C\nВлажность: ${w.current.relative_humidity_2m}%\nВетер: ${Math.round(w.current.wind_speed_10m)} км/ч\n\nПрогноз:\n` + w.daily.time.map((d,i)=>`${i===0?'Сегодня':i===1?'Завтра':d}: ${Math.round(w.daily.temperature_2m_min[i])}...${Math.round(w.daily.temperature_2m_max[i])}°C`).join('\n');
  } catch(e){ return 'Не удалось получить погоду: ' + e.message; }
}
