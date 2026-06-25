
  // ── Stars ──
  const svg = document.getElementById('stars-svg');
  for (let i = 0; i < 120; i++) {
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', Math.random()*100+'%');
    c.setAttribute('cy', Math.random()*100+'%');
    c.setAttribute('r', (Math.random()*1.5+0.3).toFixed(2));
    c.setAttribute('fill','white');
    const dur=(2+Math.random()*4).toFixed(1), delay=(Math.random()*5).toFixed(1);
    c.style.animation=`twinkle ${dur}s ${delay}s ease-in-out infinite`;
    svg.appendChild(c);
  }

  // ── Waveform bars ──
  const waveform = document.getElementById('waveform');
  const BARS = 24;
  const heights = [8,12,18,24,30,36,30,24,18,12,8,14,20,28,36,28,20,14,10,16,22,30,22,16];
  for (let i=0;i<BARS;i++) {
    const b=document.createElement('div'); b.className='wave-bar';
    b.style.setProperty('--h', heights[i]+'px');
    b.style.animationDelay = (i*0.07).toFixed(2)+'s';
    waveform.appendChild(b);
  }
  let waveInterval = null;
  function startWave(color='#A78BFA') {
    waveform.classList.add('active');
    [...waveform.children].forEach((b,i)=>{
      b.style.background=color;
      b.style.animation=`voice-bar ${0.5+Math.random()*0.5}s ${(i*0.05).toFixed(2)}s ease-in-out infinite`;
    });
  }
  function stopWave() {
    waveform.classList.remove('active');
    [...waveform.children].forEach(b=>{ b.style.animation='none'; b.style.height='4px'; });
  }

  // ── Tab switching ──
  function switchTab(tab) {
    document.getElementById('tab-chat').classList.toggle('active', tab==='chat');
    document.getElementById('tab-voice').classList.toggle('active', tab==='voice');
    document.getElementById('chat-tab').style.display = tab==='chat' ? 'flex' : 'none';
    const vt = document.getElementById('voice-tab');
    vt.style.display = tab==='voice' ? 'flex' : 'none';
    document.getElementById('projects-list').style.display = tab==='chat' ? 'block' : 'none';
    document.getElementById('new-project-area').style.display = tab==='chat' ? 'block' : 'none';
    if(window.innerWidth <= 768) toggleMobileSidebar(false);
  }

  // ── Mobile sidebar (hamburger drawer) ──
  function toggleMobileSidebar(force){
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebar-backdrop');
    const open = typeof force === 'boolean' ? force : !sb.classList.contains('open');
    sb.classList.toggle('open', open);
    bd.classList.toggle('open', open);
  }
  window.toggleMobileSidebar = toggleMobileSidebar;

  // ── State + saved chats ──
  const PROJECT_COLORS = ["#A78BFA","#60A5FA","#34D399","#F472B6","#FBBF24","#38BDF8","#C084FC","#4ADE80"];
  const STORAGE_KEY = 'galai_saved_workspace_v3';
  const defaultProjects=[
    {id:1,name:"Личное",color:"#A78BFA",chats:[{id:101,name:"Планирование",messages:[{role:"assistant",text:"Привет! Чем могу помочь?"}]}]},
    {id:2,name:"Работа",color:"#60A5FA",chats:[{id:201,name:"Анализ данных",messages:[{role:"assistant",text:"Привет! Чем могу помочь?"}]}]}
  ];
  let nextId=500, activeChatId=101, activeProjectId=1, loading=false, showNewChat=null;
  let projects=JSON.parse(JSON.stringify(defaultProjects));
  const collapsed={};

  function loadWorkspace(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const data=JSON.parse(raw);
      if(data && Array.isArray(data.projects) && data.projects.length){
        projects=data.projects;
        activeChatId=data.activeChatId || projects[0]?.chats?.[0]?.id || 101;
        activeProjectId=data.activeProjectId || projects[0]?.id || 1;
        nextId=data.nextId || Math.max(500, ...projects.flatMap(p=>[p.id, ...(p.chats||[]).map(c=>c.id)])) + 1;
      }
    }catch(e){ console.warn('GALAI: не удалось загрузить чаты', e); }
  }
  function saveWorkspace(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({projects,activeChatId,activeProjectId,nextId})); }
    catch(e){ console.warn('GALAI: не удалось сохранить чаты', e); }
  }
  function resetWorkspace(){
    if(!confirm('Удалить сохранённые чаты GALAI на этом устройстве?')) return;
    localStorage.removeItem(STORAGE_KEY);
    projects=JSON.parse(JSON.stringify(defaultProjects));
    nextId=500; activeChatId=101; activeProjectId=1; loading=false; showNewChat=null;
    renderAll();
  }
  window.resetGalaiChats=resetWorkspace;
  loadWorkspace();

  function getActiveChat(){return projects.flatMap(p=>p.chats||[]).find(c=>c.id===activeChatId);}
  function getActiveProject(){return projects.find(p=>p.id===activeProjectId);}

  // ── Local AI (no API key needed) ──
  async function callAPI(messages, onChunk) {
    var last = (messages[messages.length-1] || {}).content || "";
    var lower = last.toLowerCase();

    // Weather needs a real API call (exact data) - always deterministic, never the LLM.
    if(/(погод|температур|weather|дождь|снег|солнц|ветер|прогноз|холодн|тепло|жарк|мороз|климат|градус)/.test(lower)) {
      return await galaiWeatherReply(last);
    }

    // Explicit "search the internet" requests, plus general factual lookups
    // ("кто такой X", "что такое X") - these go to a real web source (Wikipedia)
    // instead of the LLM guessing from memory, since tiny local models often
    // don't know current/specific facts and can confidently make things up.
    var isExplicitWebAsk = /найди в интернете|поищи в сети|загугли|поиск в интернете|что (в )?интернете|актуальн[а-яё]* информаци|последние новости|свежие новости|новости (про|о|об) /.test(lower);
    var isFactAsk = /^(кто так(ой|ая|ое|ие)|что тако(е|й|я|вы)|расскажи (мне )?(о|про)|объясни[, ]*что такое|когда (был|появил|произош|случил|основал|родил|умер))/.test(lower);
    var isCountryAsk = /столиц[а-яё]*|население|официальн[а-яё]* язык|валют[а-яё]*( страны)?|флаг страны|площадь страны/.test(lower);

    if(isExplicitWebAsk || isFactAsk || isCountryAsk){
      var webResult = await galaiWebLookup(last);
      if(webResult) return webResult;
      // If lookup found nothing (no article, network blocked, etc.), fall
      // through to the normal AI/local-reply flow below instead of dead-ending.
    }

    var isCodeAsk = /змейк|тетрис|tetris|крестик.*нолик|tic.?tac.?toe|понг|pong|калькулятор|calculator|напиши код|сделай код|создай код|перепиши код|измени код|исправь код|допиши код|код для|функци|скрипт|программ/.test(lower);

    // If the real local model is loaded, let IT actually write/modify the code -
    // it reasons over the request instead of returning a fixed memorized snippet.
    if(window.GALAI_ENGINE_READY && window.galaiRealThink){
      try {
        return await window.galaiRealThink(messages, {forCode:isCodeAsk, onChunk:onChunk});
      } catch(e){
        console.error('GALAI real-think failed, falling back:', e);
        return galaiLocalReply(last, messages);
      }
    }

    // Model not ready yet (still loading / failed / no WebGPU) - use the
    // pre-written snippets just as a stopgap so the app stays usable.
    if(isCodeAsk){
      await new Promise(function(r){ setTimeout(r, 300); });
      return galaiLocalReply(last, messages) + '\n\n(Это заготовка - локальный ИИ ещё не загрузился. Когда загрузится, я смогу писать и переделывать код сам, под твою задачу.)';
    }

    await new Promise(function(r){ setTimeout(r, 400 + Math.random()*600); });
    return galaiLocalReply(last, messages);
  }

  // ── Internet lookup (Google via backend first; safe fallbacks without API key) ──
  // ВАЖНО: Google API key нельзя хранить в HTML. Этот файл вызывает свой backend:
  //   /api/search?q=...
  // Backend пример лежит в server.js в комплекте. Он использует переменные:
  //   GOOGLE_API_KEY и GOOGLE_CX
  const GALAI_SEARCH_ENDPOINT = window.GALAI_SEARCH_ENDPOINT || '/api/search';

  async function galaiWebLookup(query){
    var lower = query.toLowerCase();

    // 1) Сначала Google через твой backend. Это основной поиск по интернету.
    var googleResult = await googleSearchFetch(query);
    if(googleResult) return googleResult;

    // 2) Если backend не настроен / API недоступен, оставляем старые бесплатные источники,
    // чтобы GALAI не ломался полностью.
    var countryFact = /столиц[а-яё]*|население|официальн[а-яё]* язык|валют[а-яё]*( страны)?|флаг страны|площадь страны|часовой пояс/.test(lower);
    if(countryFact){
      var countryResult = await countryFactLookup(query);
      if(countryResult) return countryResult;
    }

    var subject = extractSearchSubject(query);
    if(!subject) return null;

    var result = await wikiFetch(subject);
    if(result) return result;

    var words = query.replace(/[?!.]+$/g, '').trim().split(/\s+/);
    if(words.length > 1){
      var shortSubject = words.slice(-2).join(' ');
      if(shortSubject.toLowerCase() !== subject.toLowerCase()){
        result = await wikiFetch(shortSubject);
        if(result) return result;
      }
      var lastWord = words[words.length-1];
      if(lastWord.toLowerCase() !== shortSubject.toLowerCase()){
        result = await wikiFetch(lastWord);
        if(result) return result;
      }
    }

    result = await duckDuckGoFetch(subject);
    if(result) return result;

    return 'Я попытался найти ответ через Google, Wikipedia и DuckDuckGo, но ничего надёжного не нашёл. Проверь, запущен ли backend /api/search и правильно ли заданы GOOGLE_API_KEY и GOOGLE_CX.';
  }

  function extractSearchSubject(query){
    var subject = query
      .replace(/найди в интернете|поищи в сети|загугли|поиск в интернете|поиск в google|гугл|google|что (в )?интернете|актуальн[а-яё]* информаци[а-яё]*( о| про| об)?|последние новости( про| о| об)?|свежие новости( про| о| об)?|новости (про|о|об) /gi, '')
      .replace(/^(кто так(ой|ая|ое|ие)|что тако(е|й|я|вы)|расскажи (мне )?(о|про)|объясни[, ]*что такое)/gi, '')
      .replace(/^когда\s+(был[аи]?\s+[а-яёa-z]+|появил[а-яё]*|произош[а-яё]*|случил[а-яё]*|основал[а-яё]*|родил[а-яё]*|умер[а-яё]*|создал[а-яё]*)/gi, '')
      .replace(/[?!.]+$/g, '')
      .trim();
    return subject || query.trim();
  }

  async function googleSearchFetch(query){
    try {
      var url = GALAI_SEARCH_ENDPOINT + '?q=' + encodeURIComponent(query);
      var res = await fetch(url, {headers:{'Accept':'application/json'}});
      if(!res.ok) {
        console.warn('GALAI Google search endpoint returned', res.status);
        return null;
      }
      var data = await res.json();
      var items = data.items || data.results || [];
      if(!Array.isArray(items) || !items.length) return null;

      var answer = '🌐 Найдено через Google:\n\n';
      if(data.answer) answer += data.answer + '\n\n';
      answer += items.slice(0, 7).map(function(item, i){
        var title = item.title || 'Источник ' + (i+1);
        var snippet = item.snippet || item.description || '';
        var link = item.link || item.url || '';
        return (i+1) + '. ' + title + (snippet ? '\n' + snippet : '') + (link ? '\n' + link : '');
      }).join('\n\n');
      answer += '\n\nИсточник поиска: Google Programmable Search через твой backend.';
      return answer;
    } catch(e){
      console.warn('GALAI Google search unavailable, using fallbacks:', e);
      return null;
    }
  }

  async function wikiFetch(subject){
    try {
      // 1. Find the best-matching article title via opensearch.
      var searchUrl = 'https://ru.wikipedia.org/w/api.php?action=opensearch&search=' +
        encodeURIComponent(subject) + '&limit=1&namespace=0&format=json&origin=*';
      var sRes = await fetch(searchUrl);
      if(!sRes.ok) return null;
      var sData = await sRes.json();
      var title = sData && sData[1] && sData[1][0];
      if(!title) return null;

      // 2. Fetch a clean summary for that article.
      var sumUrl = 'https://ru.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title);
      var sumRes = await fetch(sumUrl);
      if(!sumRes.ok) return null;
      var sumData = await sumRes.json();
      if(!sumData.extract) return null;

      var pageUrl = (sumData.content_urls && sumData.content_urls.desktop && sumData.content_urls.desktop.page)
        || ('https://ru.wikipedia.org/wiki/' + encodeURIComponent(title));

      return '🌐 Из интернета (Wikipedia):\n\n' + sumData.extract + '\n\nИсточник: ' + pageUrl;
    } catch(e){
      console.error('GALAI web lookup failed (Wikipedia):', e);
      return null;
    }
  }

  // DuckDuckGo Instant Answer - free, no API key, decent for general
  // knowledge/short facts that Wikipedia's article-title search might miss.
  async function duckDuckGoFetch(subject){
    try {
      var url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(subject) + '&format=json&no_html=1&skip_disambig=1';
      var res = await fetch(url);
      if(!res.ok) return null;
      var data = await res.json();
      var text = data.AbstractText || data.Answer || (data.Definition || '');
      if(!text) return null;
      var source = data.AbstractURL || data.AbstractSource || 'DuckDuckGo';
      return '🌐 Из интернета (DuckDuckGo):\n\n' + text + '\n\nИсточник: ' + source;
    } catch(e){
      console.error('GALAI web lookup failed (DuckDuckGo):', e);
      return null;
    }
  }

  // REST Countries - free, no API key, precise structured facts about
  // countries (much more reliable than parsing a Wikipedia paragraph for
  // a single number like population or capital).
  async function countryFactLookup(query){
    var lower = query.toLowerCase();
    // Pull out the likely country name: usually the word(s) right after a
    // preposition like "в", "у", or just the trailing proper noun.
    var words = query.replace(/[?!.]+$/g, '').trim().split(/\s+/);
    var candidate = words[words.length-1];
    // Try progressively shorter trailing word-groups too, in case the
    // country name is two words (e.g. "Южная Корея", "Saudi Arabia").
    var candidates = [candidate];
    if(words.length > 1) candidates.unshift(words.slice(-2).join(' '));

    // Russian country names get declined ("Франции", "Японии", "Бразилии")
    // but REST Countries' translation index expects the nominative form
    // ("Франция", "Япония", "Бразилия"). Try stripping common case endings
    // too, since the API does exact-ish text matching.
    var expanded = [];
    candidates.forEach(function(c){
      expanded.push(c);
      var stripped = c.replace(/(ии|ия|ие|ой|ей|ом|ем|ах|ях|у|ю|и|е|а|я)$/i, '');
      if(stripped.length >= 3 && stripped !== c){
        expanded.push(stripped + 'а');   // Бразили+я -> Бразили -> Бразилия
        expanded.push(stripped + 'ия');  // Франци+и -> Франци -> Франция... handled below too
        expanded.push(stripped);
      }
    });
    candidates = expanded.filter(function(v,i,arr){ return arr.indexOf(v)===i; });

    for(var i=0;i<candidates.length;i++){
      try {
        var url = 'https://restcountries.com/v3.1/translation/' + encodeURIComponent(candidates[i]);
        var res = await fetch(url);
        if(!res.ok) continue;
        var data = await res.json();
        var c = Array.isArray(data) ? data[0] : data;
        if(!c || !c.name) continue;

        var nameRu = (c.translations && c.translations.rus && c.translations.rus.common) || c.name.common;
        var capital = (c.capital && c.capital[0]) || 'неизвестна';
        var population = c.population ? c.population.toLocaleString('ru-RU') : 'неизвестно';
        var region = c.region || '';
        var languages = c.languages ? Object.values(c.languages).join(', ') : 'неизвестны';
        var currencies = c.currencies ? Object.values(c.currencies).map(function(cur){return cur.name;}).join(', ') : 'неизвестна';
        var area = c.area ? c.area.toLocaleString('ru-RU') + ' км²' : 'неизвестна';

        return '🌐 Из интернета (REST Countries):\n\n' +
          '🏳️ ' + nameRu + '\n' +
          'Столица: ' + capital + '\n' +
          'Население: ' + population + '\n' +
          'Регион: ' + region + '\n' +
          'Языки: ' + languages + '\n' +
          'Валюта: ' + currencies + '\n' +
          'Площадь: ' + area;
      } catch(e){
        console.error('GALAI web lookup failed (REST Countries):', e);
      }
    }
    return null;
  }

  async function galaiWeatherReply(q) {
    var lower = q.toLowerCase();
    var city = "Москва";
    var m;
    m = lower.match(/погод[^ ]*\s+в\s+([а-яёa-zA-Z][а-яёa-zA-Z\s\-]{1,25})/i);
    if(!m) m = lower.match(/погод[^ ]*\s+([а-яёa-zA-Z][а-яёa-zA-Z\s\-]{1,25})/i);
    if(!m) m = lower.match(/в\s+([а-яёa-zA-Z][а-яёa-zA-Z\s\-]{1,25})\s+погод/i);
    if(!m) m = lower.match(/weather\s+in\s+([a-zA-Z][a-zA-Z\s\-]{1,25})/i);
    if(!m) m = lower.match(/температур[^ ]*\s+в\s+([а-яёa-zA-Z][а-яёa-zA-Z\s\-]{1,25})/i);
    if(m && m[1] && m[1].trim().length > 1) city = m[1].trim();

    // Hardcoded coords for popular cities (fallback if geocoding fails)
    var knownCities = {
      "москва": [55.7558, 37.6173, "Москва, Россия"],
      "санкт-петербург": [59.9311, 30.3609, "Санкт-Петербург, Россия"],
      "спб": [59.9311, 30.3609, "Санкт-Петербург, Россия"],
      "новосибирск": [54.9833, 82.8964, "Новосибирск, Россия"],
      "екатеринбург": [56.8519, 60.6122, "Екатеринбург, Россия"],
      "казань": [55.7887, 49.1221, "Казань, Россия"],
      "лондон": [51.5074, -0.1278, "Лондон, Великобритания"],
      "london": [51.5074, -0.1278, "London, UK"],
      "париж": [48.8566, 2.3522, "Париж, Франция"],
      "paris": [48.8566, 2.3522, "Paris, France"],
      "берлин": [52.5200, 13.4050, "Берлин, Германия"],
      "berlin": [52.5200, 13.4050, "Berlin, Germany"],
      "нью-йорк": [40.7128, -74.0060, "Нью-Йорк, США"],
      "new york": [40.7128, -74.0060, "New York, USA"],
      "токио": [35.6762, 139.6503, "Токио, Япония"],
      "tokyo": [35.6762, 139.6503, "Tokyo, Japan"],
      "пекин": [39.9042, 116.4074, "Пекин, Китай"],
      "дубай": [25.2048, 55.2708, "Дубай, ОАЭ"],
      "dubai": [25.2048, 55.2708, "Dubai, UAE"],
      "рим": [41.9028, 12.4964, "Рим, Италия"],
      "мадрид": [40.4168, -3.7038, "Мадрид, Испания"],
      "киев": [50.4501, 30.5234, "Киев, Украина"],
      "минск": [53.9045, 27.5615, "Минск, Беларусь"],
      "алматы": [43.2220, 76.8512, "Алматы, Казахстан"],
      "ташкент": [41.2995, 69.2401, "Ташкент, Узбекистан"],
      "красноярск": [56.0153, 92.8932, "Красноярск, Россия"],
      "нижний новгород": [56.2965, 43.9361, "Нижний Новгород, Россия"],
      "челябинск": [55.1644, 61.4368, "Челябинск, Россия"],
      "самара": [53.2038, 50.1606, "Самара, Россия"],
      "уфа": [54.7388, 55.9721, "Уфа, Россия"],
      "ростов-на-дону": [47.2357, 39.7015, "Ростов-на-Дону, Россия"],
      "пермь": [58.0105, 56.2502, "Пермь, Россия"],
      "воронеж": [51.6720, 39.1843, "Воронеж, Россия"],
      "волгоград": [48.7080, 44.5133, "Волгоград, Россия"],
      "краснодар": [45.0355, 38.9753, "Краснодар, Россия"],
      "саратов": [51.5924, 46.0340, "Саратов, Россия"],
      "тюмень": [57.1522, 65.5272, "Тюмень, Россия"],
      "иркутск": [52.2978, 104.2964, "Иркутск, Россия"],
      "хабаровск": [48.4827, 135.0840, "Хабаровск, Россия"],
      "владивосток": [43.1332, 131.9113, "Владивосток, Россия"],
      "барнаул": [53.3606, 83.7636, "Барнаул, Россия"],
      "омск": [54.9885, 73.3242, "Омск, Россия"],
      "сочи": [43.5992, 39.7257, "Сочи, Россия"],
      "мурманск": [68.9585, 33.0827, "Мурманск, Россия"],
      "архангельск": [64.5401, 40.5433, "Архангельск, Россия"],
    };

    // Normalize: strip Russian case endings to get nominative form
    function normCity(s) {
      s = s.toLowerCase().replace(/ё/g,"е").trim();
      // Try stripping common endings (locative, genitive, dative etc)
      var endings = ["ском","ской","ских","ским","ске","ске","сках","нске","нска","нску","нском","нской","ске","ске","ях","ах","ом","ем","ой","ей","ую","юю","ого","его","ему","ому","е","и","а","у","ю"];
      for(var i=0;i<endings.length;i++){
        if(s.endsWith(endings[i]) && s.length - endings[i].length > 2){
          var base = s.slice(0, s.length - endings[i].length);
          // check if base+к or base+ск forms a known key
          if(knownCities[base] || knownCities[base+"к"] || knownCities[base+"рск"] || knownCities[base+"ск"]) break;
          // return base for geocoding
          return base;
        }
      }
      return s;
    }
    var cityKey = normCity(city);
    // Also try original
    var cityKeyOrig = city.toLowerCase().replace(/ё/g,"е").trim();
    var lat, lon, locName;

    if(knownCities[cityKeyOrig] || knownCities[cityKey]) {
      var ck = knownCities[cityKeyOrig] ? cityKeyOrig : cityKey;
      lat = knownCities[ck][0];
      lon = knownCities[ck][1];
      locName = knownCities[ck][2];
    } else {
      // Try geocoding API
      try {
        var searchCity = cityKey.length > 2 ? cityKey : city;
        var geoRes = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(searchCity) + "&count=1&language=ru&format=json");
        var geoData = await geoRes.json();
        if(!geoData.results || !geoData.results.length)
          return "Не нашёл город \"" + city + "\". Попробуй написать иначе, например: \"погода Красноярск\"";
        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
        locName = geoData.results[0].name + (geoData.results[0].country ? ", " + geoData.results[0].country : "");
      } catch(geoErr) {
        return "Не удалось определить город. Попробуй один из: Москва, Лондон, Париж, Берлин, Токио, Нью-Йорк, Дубай.";
      }
    }

    try {
      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon
        + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m"
        + "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=3";
      var wRes = await fetch(url);
      if(!wRes.ok) return "Сервер погоды недоступен (статус " + wRes.status + "). Попробуй позже.";
      var w = await wRes.json();
      var cur = w.current, daily = w.daily;
      function wEmoji(c){ if(c===0)return "☀️"; if(c<=2)return "⛅"; if(c<=3)return "☁️"; if(c<=48)return "🌫️"; if(c<=67)return "🌧️"; if(c<=77)return "❄️"; if(c<=82)return "🌦️"; if(c<=86)return "🌨️"; return "⛈️"; }
      function wDesc(c){ if(c===0)return "ясно"; if(c===1)return "преимущественно ясно"; if(c===2)return "переменная облачность"; if(c===3)return "пасмурно"; if(c<=48)return "туман"; if(c<=55)return "морось"; if(c<=65)return "дождь"; if(c<=67)return "ледяной дождь"; if(c<=77)return "снег"; if(c<=82)return "ливень"; if(c<=86)return "снегопад"; return "гроза"; }
      function wWind(d){ var dirs=["С","СВ","В","ЮВ","Ю","ЮЗ","З","СЗ"]; return dirs[Math.round(d/45)%8]; }
      var reply = wEmoji(cur.weather_code) + " Погода в " + locName + ":\n";
      reply += "Сейчас: " + Math.round(cur.temperature_2m) + "°C, " + wDesc(cur.weather_code) + "\n";
      reply += "Ощущается: " + Math.round(cur.apparent_temperature) + "°C\n";
      reply += "Влажность: " + cur.relative_humidity_2m + "%\n";
      reply += "Ветер: " + Math.round(cur.wind_speed_10m) + " км/ч " + wWind(cur.wind_direction_10m) + "\n";
      if(cur.precipitation > 0) reply += "Осадки: " + cur.precipitation + " мм\n";
      reply += "\nПрогноз:\n";
      for(var d=0; d<3; d++){
        var date = new Date(daily.time[d]);
        var dayName = d===0 ? "Сегодня" : d===1 ? "Завтра" : date.toLocaleDateString("ru-RU",{weekday:"short"});
        reply += wEmoji(daily.weather_code[d]) + " " + dayName + ": " + Math.round(daily.temperature_2m_min[d]) + "..." + Math.round(daily.temperature_2m_max[d]) + "°C";
        if(daily.precipitation_sum[d] > 0) reply += ", " + Math.round(daily.precipitation_sum[d]) + " мм";
        reply += "\n";
      }
      return reply;
    } catch(e) {
      return "Ошибка получения погоды: " + e.message + ". Попробуй открыть galai.html напрямую в браузере (не из claude.ai).";
    }
  }

  const SNAKE_CODE = 'Вот рабочая змейка на HTML+JS! Скопируй весь код в файл snake.html и открой в браузере:\n\n' +
'<!DOCTYPE html>\n' +
'<html><head><meta charset="UTF-8"><title>Змейка</title>\n' +
'<style>\n' +
'body{background:#111;display:flex;flex-direction:column;align-items:center;font-family:sans-serif;color:#fff}\n' +
'canvas{background:#222;border:2px solid #4ade80;margin-top:20px}\n' +
'#score{font-size:20px;margin-top:10px}\n' +
'</style></head><body>\n' +
'<div id="score">Очки: 0</div>\n' +
'<canvas id="game" width="400" height="400"></canvas>\n' +
'<p>Управление: стрелки на клавиатуре</p>\n' +
'<script>\n' +
'const canvas=document.getElementById("game");\n' +
'const ctx=canvas.getContext("2d");\n' +
'const box=20;\n' +
'let snake=[{x:9*box,y:9*box}];\n' +
'let direction="RIGHT";\n' +
'let food={x:Math.floor(Math.random()*19)*box,y:Math.floor(Math.random()*19)*box};\n' +
'let score=0;\n' +
'document.addEventListener("keydown",e=>{\n' +
'  if(e.key==="ArrowLeft"&&direction!=="RIGHT")direction="LEFT";\n' +
'  if(e.key==="ArrowUp"&&direction!=="DOWN")direction="UP";\n' +
'  if(e.key==="ArrowRight"&&direction!=="LEFT")direction="RIGHT";\n' +
'  if(e.key==="ArrowDown"&&direction!=="UP")direction="DOWN";\n' +
'});\n' +
'function draw(){\n' +
'  ctx.fillStyle="#222";ctx.fillRect(0,0,canvas.width,canvas.height);\n' +
'  snake.forEach((s,i)=>{\n' +
'    ctx.fillStyle=i===0?"#4ade80":"#22c55e";\n' +
'    ctx.fillRect(s.x,s.y,box,box);\n' +
'    ctx.strokeStyle="#111";ctx.strokeRect(s.x,s.y,box,box);\n' +
'  });\n' +
'  ctx.fillStyle="#f43f5e";\n' +
'  ctx.fillRect(food.x,food.y,box,box);\n' +
'  let headX=snake[0].x, headY=snake[0].y;\n' +
'  if(direction==="LEFT")headX-=box;\n' +
'  if(direction==="UP")headY-=box;\n' +
'  if(direction==="RIGHT")headX+=box;\n' +
'  if(direction==="DOWN")headY+=box;\n' +
'  if(headX===food.x&&headY===food.y){\n' +
'    score++;\n' +
'    document.getElementById("score").textContent="Очки: "+score;\n' +
'    food={x:Math.floor(Math.random()*19)*box,y:Math.floor(Math.random()*19)*box};\n' +
'  } else {\n' +
'    snake.pop();\n' +
'  }\n' +
'  const newHead={x:headX,y:headY};\n' +
'  if(headX<0||headX>=canvas.width||headY<0||headY>=canvas.height||collision(newHead,snake)){\n' +
'    clearInterval(game);\n' +
'    alert("Игра окончена! Очки: "+score);\n' +
'    return;\n' +
'  }\n' +
'  snake.unshift(newHead);\n' +
'}\n' +
'function collision(head,arr){\n' +
'  return arr.some(s=>s.x===head.x&&s.y===head.y);\n' +
'}\n' +
'const game=setInterval(draw,120);\n' +
'<\/script></body></html>\n\n' +
'Управление — стрелки. Хочешь добавить уровни сложности или мобильное управление свайпами?';

  const TICTACTOE_CODE = 'Вот крестики-нолики на HTML+JS:\n\n' +
'<!DOCTYPE html>\n' +
'<html><head><meta charset="UTF-8"><title>Крестики-нолики</title>\n' +
'<style>\n' +
'body{background:#111;display:flex;flex-direction:column;align-items:center;font-family:sans-serif;color:#fff}\n' +
'#board{display:grid;grid-template-columns:repeat(3,100px);gap:5px;margin-top:20px}\n' +
'.cell{width:100px;height:100px;background:#222;border:2px solid #4ade80;font-size:48px;display:flex;align-items:center;justify-content:center;cursor:pointer}\n' +
'#status{font-size:20px;margin-top:15px}\n' +
'</style></head><body>\n' +
'<h2>Крестики-нолики</h2>\n' +
'<div id="board"></div>\n' +
'<div id="status">Ход: X</div>\n' +
'<button onclick="resetGame()" style="margin-top:10px;padding:8px 16px">Заново</button>\n' +
'<script>\n' +
'let board=Array(9).fill("");\n' +
'let current="X";\n' +
'let active=true;\n' +
'const boardEl=document.getElementById("board");\n' +
'function render(){\n' +
'  boardEl.innerHTML="";\n' +
'  board.forEach((v,i)=>{\n' +
'    const c=document.createElement("div");\n' +
'    c.className="cell";c.textContent=v;\n' +
'    c.onclick=()=>makeMove(i);\n' +
'    boardEl.appendChild(c);\n' +
'  });\n' +
'}\n' +
'function makeMove(i){\n' +
'  if(!active||board[i])return;\n' +
'  board[i]=current;\n' +
'  if(checkWin()){document.getElementById("status").textContent=current+" победил!";active=false;}\n' +
'  else if(!board.includes("")){document.getElementById("status").textContent="Ничья!";active=false;}\n' +
'  else{current=current==="X"?"O":"X";document.getElementById("status").textContent="Ход: "+current;}\n' +
'  render();\n' +
'}\n' +
'function checkWin(){\n' +
'  const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];\n' +
'  return wins.some(w=>board[w[0]]&&board[w[0]]===board[w[1]]&&board[w[1]]===board[w[2]]);\n' +
'}\n' +
'function resetGame(){board=Array(9).fill("");current="X";active=true;document.getElementById("status").textContent="Ход: X";render();}\n' +
'render();\n' +
'<\/script></body></html>\n\n' +
'Хочешь добавить ИИ-противника, с которым можно играть против компьютера?';

  const PONG_CODE = 'Вот понг на HTML+JS:\n\n' +
'<!DOCTYPE html>\n' +
'<html><head><meta charset="UTF-8"><title>Pong</title>\n' +
'<style>body{background:#111;display:flex;flex-direction:column;align-items:center;font-family:sans-serif;color:#fff}\n' +
'canvas{background:#000;border:2px solid #4ade80;margin-top:20px}</style></head><body>\n' +
'<h2>Pong</h2>\n' +
'<canvas id="game" width="500" height="300"></canvas>\n' +
'<p>Управление: мышь двигает левую панель, ИИ играет справа</p>\n' +
'<script>\n' +
'const cv=document.getElementById("game");const ctx=cv.getContext("2d");\n' +
'let pLeft={y:120,h:60},pRight={y:120,h:60};\n' +
'let ball={x:250,y:150,vx:4,vy:3,r:8};\n' +
'let scoreL=0,scoreR=0;\n' +
'cv.addEventListener("mousemove",e=>{\n' +
'  const rect=cv.getBoundingClientRect();\n' +
'  pLeft.y=e.clientY-rect.top-pLeft.h/2;\n' +
'});\n' +
'function loop(){\n' +
'  ctx.fillStyle="#000";ctx.fillRect(0,0,cv.width,cv.height);\n' +
'  ball.x+=ball.vx;ball.y+=ball.vy;\n' +
'  if(ball.y<0||ball.y>cv.height)ball.vy*=-1;\n' +
'  if(ball.x<20&&ball.y>pLeft.y&&ball.y<pLeft.y+pLeft.h){ball.vx*=-1;}\n' +
'  if(ball.x>cv.width-20&&ball.y>pRight.y&&ball.y<pRight.y+pRight.h){ball.vx*=-1;}\n' +
'  if(ball.x<0){scoreR++;ball.x=250;ball.y=150;}\n' +
'  if(ball.x>cv.width){scoreL++;ball.x=250;ball.y=150;}\n' +
'  pRight.y+=(ball.y-pRight.y-pRight.h/2)*0.1;\n' +
'  ctx.fillStyle="#4ade80";\n' +
'  ctx.fillRect(10,pLeft.y,10,pLeft.h);\n' +
'  ctx.fillRect(cv.width-20,pRight.y,10,pRight.h);\n' +
'  ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();\n' +
'  ctx.font="24px sans-serif";ctx.fillText(scoreL+"  :  "+scoreR,cv.width/2-30,30);\n' +
'  requestAnimationFrame(loop);\n' +
'}\n' +
'loop();\n' +
'<\/script></body></html>\n\n' +
'Хочешь сделать управление с двух сторон (для игры вдвоём) вместо ИИ?';

  const CALC_CODE = 'Вот калькулятор на HTML+JS:\n\n' +
'<!DOCTYPE html>\n' +
'<html><head><meta charset="UTF-8"><title>Калькулятор</title>\n' +
'<style>\n' +
'body{background:#111;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif}\n' +
'#calc{background:#1a1a1a;border-radius:16px;padding:20px;width:280px}\n' +
'#display{background:#222;color:#fff;font-size:28px;text-align:right;padding:15px;border-radius:8px;margin-bottom:10px;min-height:40px}\n' +
'.row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px}\n' +
'button{padding:18px;font-size:18px;border:none;border-radius:8px;background:#333;color:#fff;cursor:pointer}\n' +
'button:hover{background:#444}\n' +
'.op{background:#4ade80;color:#000}\n' +
'</style></head><body>\n' +
'<div id="calc">\n' +
'<div id="display">0</div>\n' +
'<div class="row"><button onclick="clearAll()">C</button><button onclick="del()">⌫</button><button onclick="appendVal(\'%\')">%</button><button class="op" onclick="appendVal(\'/\')">÷</button></div>\n' +
'<div class="row"><button onclick="appendVal(\'7\')">7</button><button onclick="appendVal(\'8\')">8</button><button onclick="appendVal(\'9\')">9</button><button class="op" onclick="appendVal(\'*\')">×</button></div>\n' +
'<div class="row"><button onclick="appendVal(\'4\')">4</button><button onclick="appendVal(\'5\')">5</button><button onclick="appendVal(\'6\')">6</button><button class="op" onclick="appendVal(\'-\')">−</button></div>\n' +
'<div class="row"><button onclick="appendVal(\'1\')">1</button><button onclick="appendVal(\'2\')">2</button><button onclick="appendVal(\'3\')">3</button><button class="op" onclick="appendVal(\'+\')">+</button></div>\n' +
'<div class="row"><button onclick="appendVal(\'0\')" style="grid-column:span 2">0</button><button onclick="appendVal(\'.\')">.</button><button class="op" onclick="calculate()">=</button></div>\n' +
'</div>\n' +
'<script>\n' +
'let display=document.getElementById("display");\n' +
'let current="";\n' +
'function appendVal(v){current+=v;display.textContent=current;}\n' +
'function clearAll(){current="";display.textContent="0";}\n' +
'function del(){current=current.slice(0,-1);display.textContent=current||"0";}\n' +
'function calculate(){\n' +
'  try{display.textContent=eval(current.replace("%","/100"));current=display.textContent;}\n' +
'  catch(e){display.textContent="Ошибка";current="";}\n' +
'}\n' +
'<\/script></body></html>\n\n' +
'Хочешь добавить научные функции (синус, корень, степень)?';

  function galaiLocalReply(q, history) {
    var lower = q.toLowerCase().trim();

    if(/(кто ты|что ты|как тебя зовут|расскажи о себе|ты кто)/.test(lower))
      return 'Я GALAI - искусственный интеллект, созданный GALAXYCOPP. Умею: отвечать на вопросы, писать код, показывать погоду в любом городе, искать факты в интернете (Wikipedia, DuckDuckGo, данные о странах), помогать с творчеством. Спрашивай!';
    if(/(кто тебя создал|кто разработал|galaxycopp)/.test(lower))
      return 'Меня создала команда GALAXYCOPP. Я здесь чтобы помогать тебе с любыми задачами!';

    if(/^(привет|хай|hi|hello|здравствуй|салют|хэй|hey)/.test(lower)){
      var greets = ['Привет! Чем могу помочь?', 'Привет! Рад тебя видеть! Что хочешь обсудить?', 'Здравствуй! Задавай вопросы - я готов!'];
      return greets[Math.floor(Math.random()*greets.length)];
    }
    if(/(как дела|как ты|как сам|как жизнь)/.test(lower))
      return 'Отлично! Работаю в штатном режиме и готов помогать. А ты как?';
    if(/(спасибо|благодар|thanks|thank you)/.test(lower)){
      var ty = ['Пожалуйста! Обращайся если что', 'Всегда рад помочь!', 'Не за что! Ещё вопросы есть?'];
      return ty[Math.floor(Math.random()*ty.length)];
    }
    if(/(пока|до свидания|bye|goodbye|чао)/.test(lower))
      return 'До встречи! Возвращайся когда понадоблюсь';

    if(/(который час|сколько времени|какой день|какое число|какой год|дата|время)/.test(lower)){
      var now = new Date();
      return 'Сейчас: ' + now.toLocaleString('ru-RU', {weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    }

    // Specific game/program names are checked FIRST, independent of phrasing -
    // if the user mentions "змейка" anywhere, that alone is intent enough,
    // regardless of whether they said "напиши", "сделай", "хочу", "дай код" etc.
    if(/змейк/.test(lower)) return SNAKE_CODE;
    if(/тетрис|tetris/.test(lower)) return 'Тетрис - довольно объёмная игра (300+ строк). Хочешь упрощённую версию (падающие блоки без вращения) или полную с вращением фигур? Уточни и напишу!';
    if(/крестик.*нолик|tic.?tac.?toe/.test(lower)) return TICTACTOE_CODE;
    if(/понг|pong/.test(lower)) return PONG_CODE;
    if(/калькулятор|calculator/.test(lower)) return CALC_CODE;

    var codeIntent = /(напиши|сделай|создай|придумай|нужен|нужна|хочу|дай|накидай).*?(код|игр|программ|скрипт|приложен)|помоги с кодом|как написать|функция на|программ|python|javascript|\bjs\b|html|css|sql/.test(lower);
    if(codeIntent){
      if(/python/.test(lower)) return 'Пример на Python:\n\ndef main():\n    print("Привет, мир!")\n\nif __name__ == "__main__":\n    main()\n\nОпиши задачу подробнее - напишу под неё!';
      if(/javascript|\bjs\b/.test(lower)) return 'Пример на JavaScript:\n\nfunction greet(name) {\n  return "Привет, " + name + "!";\n}\nconsole.log(greet("GALAI"));\n\nОпиши задачу - сделаю под неё!';
      if(/html/.test(lower)) return 'Базовый HTML:\n\n<!DOCTYPE html>\n<html lang="ru">\n<head><meta charset="UTF-8"><title>Страница</title></head>\n<body><h1>Привет!</h1></body>\n</html>\n\nЧто хочешь сделать?';
      return 'Расскажи подробнее: какой язык, что должна делать программа? Могу написать игры (змейка, тетрис, понг, крестики-нолики), калькулятор и многое другое!';
    }

    if(/(стих|поэм|рифм)/.test(lower))
      return 'В глубинах космоса звёзды горят,\nGALAI с тобой всегда говорит.\nВопрос ли сложный, простой или нет -\nНайдём вместе правильный ответ.\n\nХочешь на другую тему?';
    if(/(шутк|анекдот|смешн|пошути)/.test(lower))
      return 'Почему программисты путают Хэллоуин и Рождество? Потому что Oct 31 = Dec 25! Ещё?';
    if(/(напиши|сочини|придумай|составь|эссе|письмо|сообщение|пост)/.test(lower))
      return 'Конечно помогу написать! Уточни:\n- Что именно написать?\n- Для кого и в каком стиле?\n- Нужна ли определённая длина?';

    if(/чёрн.* дыр|черная дыра/.test(lower))
      return 'Чёрная дыра - область пространства с такой сильной гравитацией, что даже свет не может её покинуть. Образуется при коллапсе массивной звезды. На границе находится горизонт событий - точка невозврата.';
    if(/квант/.test(lower))
      return 'Квантовая механика - раздел физики, описывающий поведение частиц на атомном уровне. Ключевые принципы: корпускулярно-волновой дуализм, принцип неопределённости Гейзенберга и квантовая суперпозиция.';
    if(/искусственный интеллект|что такое ии/.test(lower))
      return 'Искусственный интеллект - область компьютерных наук, создающая системы, способные выполнять задачи требующие человеческого интеллекта: понимание речи, распознавание образов, принятие решений.';

    if(/(фильм|сериал|посмотреть)/.test(lower) && /(посоветуй|порекоменд|что)/.test(lower))
      return 'Рекомендую:\nНачало (Inception) - триллер о снах\nИнтерстеллар - космическая фантастика\nМатрица - классика киберпанка\nДюна - эпическая фантастика\n\nКакой жанр нравится больше?';
    if(/(книг|почитать)/.test(lower) && /(посоветуй|порекоменд|что)/.test(lower))
      return 'Рекомендую:\n"1984" - Джордж Оруэлл\n"Автостопом по галактике" - Дуглас Адамс\n"Дюна" - Фрэнк Герберт\n"Мастер и Маргарита" - Булгаков\n\nКакой жанр предпочитаешь?';

    var fallbacks = [
      'Интересный вопрос! Расскажи подробнее - постараюсь дать развёрнутый ответ.',
      'Хороший вопрос. Можешь уточнить что именно тебя интересует?',
      'Понял тебя! Давай разберём это подробнее - что конкретно нужно?',
      'Я GALAI и готов помочь! Уточни задачу - код, текст, объяснение, идеи?',
      'Расскажи чуть больше о задаче - тогда смогу помочь точнее!'
    ];
    return fallbacks[Math.floor(Math.random()*fallbacks.length)];
  }

  function updateApiBar(){ /* no-op */ }

  // ── Sidebar render ──
  function renderSidebar(){
    const list=document.getElementById('projects-list'); list.innerHTML='';
    projects.forEach(proj=>{
      const ph=document.createElement('div'); ph.className='project-header';
      ph.innerHTML=`<div class="project-dot" style="background:${proj.color};box-shadow:0 0 6px ${proj.color}"></div><span class="project-name">${proj.name}</span><span class="collapse-arrow ${collapsed[proj.id]?'collapsed':''}">▼</span>`;
      ph.onclick=()=>{collapsed[proj.id]=!collapsed[proj.id];renderSidebar();};
      list.appendChild(ph);
      if(!collapsed[proj.id]){
        proj.chats.forEach(chat=>{
          const row=document.createElement('div'); row.className='chat-row'+(chat.id===activeChatId?' active':'');
          row.textContent=chat.name;
          if(chat.id===activeChatId){row.style.borderLeftColor=proj.color;row.style.textShadow=`0 0 12px ${proj.color}40`;}
          row.onclick=()=>{activeChatId=chat.id;activeProjectId=proj.id;saveWorkspace();renderAll();if(window.innerWidth<=768)toggleMobileSidebar(false);};
          list.appendChild(row);
        });
        if(showNewChat===proj.id){
          const ir=document.createElement('div'); ir.className='new-chat-input-row';
          const inp=document.createElement('input'); inp.className='cosmic-input'; inp.placeholder='Название...'; inp.style.borderColor=proj.color+'60';
          const btn=document.createElement('button'); btn.className='confirm-btn'; btn.style.background=proj.color; btn.style.color='#000'; btn.textContent='+';
          btn.onclick=()=>addChat(proj.id,inp.value);
          inp.onkeydown=e=>{if(e.key==='Enter')addChat(proj.id,inp.value);if(e.key==='Escape'){showNewChat=null;renderSidebar();}};
          ir.appendChild(inp);ir.appendChild(btn);list.appendChild(ir);
          setTimeout(()=>inp.focus(),0);
        } else {
          const nr=document.createElement('div'); nr.className='new-chat-row';
          nr.innerHTML=`<span style="color:${proj.color};font-size:14px">+</span> Новый чат`;
          nr.onclick=()=>{showNewChat=proj.id;renderSidebar();};
          list.appendChild(nr);
        }
      }
    });
  }

  function addChat(pid,name){
    if(!name.trim())return;
    const chatId=++nextId;
    const proj=projects.find(p=>p.id===pid);
    proj.chats.push({id:chatId,name:name.trim(),messages:[{role:'assistant',text:'Привет! Чем могу помочь?'}]});
    activeChatId=chatId;activeProjectId=pid;showNewChat=null;saveWorkspace();renderAll();
  }
  function addProject(name){
    if(!name.trim())return;
    const id=++nextId,chatId=++nextId;
    const color=PROJECT_COLORS[projects.length%PROJECT_COLORS.length];
    projects.push({id,name:name.trim(),color,chats:[{id:chatId,name:'Новый чат',messages:[{role:'assistant',text:'Привет! Чем могу помочь?'}]}]});
    activeChatId=chatId;activeProjectId=id;hideNewProjectForm();saveWorkspace();renderAll();
  }

  // ── Header ──
  function renderHeader(){
    const proj=getActiveProject(),chat=getActiveChat();
    const dot=document.getElementById('header-project-dot'),pname=document.getElementById('header-project-name'),sep=document.getElementById('header-sep'),cname=document.getElementById('header-chat-name');
    if(proj){dot.style.background=proj.color;dot.style.boxShadow=`0 0 8px ${proj.color}`;dot.style.display='block';pname.textContent=proj.name;sep.style.display='inline';}
    else{dot.style.display='none';pname.textContent='';sep.style.display='none';}
    cname.textContent=chat?.name||'Выберите чат';
    cname.style.textShadow=proj?`0 0 20px ${proj.color}60`:'none';
  }

  // ── Messages ──
  function renderMessages(){
    const chat=getActiveChat(),proj=getActiveProject(),accent=proj?.color||'#A78BFA';
    const container=document.getElementById('messages');container.innerHTML='';
    (chat?.messages||[]).forEach(msg=>{
      const row=document.createElement('div');row.className=`msg ${msg.role}`;
      if(msg.role==='assistant'){const av=document.createElement('div');av.className='ai-avatar';av.style.background=`radial-gradient(circle at 30% 30%, ${accent}, ${accent}80)`;av.style.boxShadow=`0 0 14px ${accent}60`;av.textContent='✦';row.appendChild(av);}
      const bubble=document.createElement('div');bubble.className=`bubble ${msg.role}`;bubble.textContent=msg.text;
      if(msg.role==='user'){bubble.style.background=`linear-gradient(135deg, ${accent}30, ${accent}15)`;bubble.style.border=`1px solid ${accent}50`;bubble.style.boxShadow=`0 4px 24px ${accent}20`;}
      row.appendChild(bubble);
      if(msg.role==='user'){const uav=document.createElement('div');uav.className='user-avatar';uav.textContent='◎';row.appendChild(uav);}
      container.appendChild(row);
    });
    if(loading){
      const acc=getActiveProject()?.color||'#A78BFA';
      const row=document.createElement('div');row.className='msg assistant';
      const av=document.createElement('div');av.className='ai-avatar';av.style.background=`radial-gradient(circle,${acc},${acc}80)`;av.style.boxShadow=`0 0 14px ${acc}60`;av.textContent='✦';
      const ti=document.createElement('div');ti.className='typing-indicator';
      [0,1,2].forEach(i=>{const d=document.createElement('div');d.className='dot';d.style.background=acc;d.style.boxShadow=`0 0 6px ${acc}`;d.style.animationDelay=`${i*0.2}s`;ti.appendChild(d);});
      row.appendChild(av);row.appendChild(ti);container.appendChild(row);
    }
    document.getElementById('messages-wrap').scrollTop=99999;
  }

  function updateSendBtn(){
    const btn=document.getElementById('send-btn'),val=document.getElementById('msg-input').value.trim();
    const accent=getActiveProject()?.color||'#A78BFA';
    btn.disabled=loading||!val;
    if(!loading&&val){btn.style.background=`linear-gradient(135deg,${accent},${accent}90)`;btn.style.color='#fff';btn.style.boxShadow=`0 0 20px ${accent}50`;}
    else{btn.style.background='rgba(255,255,255,0.06)';btn.style.color='rgba(255,255,255,0.2)';btn.style.boxShadow='none';}
  }

  function renderAll(){renderSidebar();renderHeader();renderMessages();updateSendBtn();}

  // ── Send text message ──
  async function sendMessage(){
    const input=document.getElementById('msg-input');
    const text=input.value.trim();const chat=getActiveChat();
    if(!text||loading||!chat)return;
    input.value='';input.style.height='auto';
    chat.messages.push({role:'user',text});loading=true;saveWorkspace();renderAll();
    try{
      const history=chat.messages.map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}));
      // Push an empty assistant bubble right away, then fill it in as tokens
      // stream in - feels instant instead of staring at a typing dot for ages.
      const liveMsg={role:'assistant',text:''};
      let started=false, lastRender=0;
      const reply=await callAPI(history, (partial)=>{
        if(!started){ chat.messages.push(liveMsg); loading=false; started=true; }
        liveMsg.text=partial;
        // Throttle re-renders to ~12/sec instead of on every single token -
        // still looks smooth but doesn't hammer the DOM on long code replies.
        const now=Date.now();
        if(now-lastRender>80){ lastRender=now; renderAll(); }
      });
      if(!started){ chat.messages.push({role:'assistant',text:reply}); }
      else { liveMsg.text=reply; }
    }catch(e){chat.messages.push({role:'assistant',text:'Ошибка: '+e.message});}
    loading=false;saveWorkspace();renderAll();
  }

  // ── VOICE ──
  let recognition=null, voiceLoading=false, voiceHistory=[];
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const synth=window.speechSynthesis;

  function setVoiceStatus(text, cls=''){
    const el=document.getElementById('voice-status');
    el.textContent=text;el.className=cls;
  }
  function setVoiceTranscript(text,cls=''){
    const el=document.getElementById('voice-transcript');
    el.textContent=text;el.className=cls;
  }
  function addVoiceLog(text,role){
    const log=document.getElementById('voice-log');
    const item=document.createElement('div');item.className=`voice-log-item ${role}`;item.textContent=text;
    log.appendChild(item);log.scrollTop=99999;
    // keep max 20
    while(log.children.length>20)log.removeChild(log.firstChild);
  }
  function setOrbState(state){
    const wrap=document.getElementById('voice-orb-wrap');
    wrap.className='';
    if(state) wrap.classList.add(state);
  }

  function pickVoice(voices){
    // If the person manually picked a voice, always use that one.
    var savedURI = localStorage.getItem('galai_voice_uri');
    if(savedURI){
      var manual = voices.find(v => v.voiceURI === savedURI);
      if(manual) return manual;
    }
    // IMPORTANT: Chrome's "Google" voices are NETWORK voices — they stream audio
    // from Google's servers. If that request is blocked (firewall/network), the
    // utterance still fires onstart/onend but produces NO audio at all, with no
    // error. Local voices (Microsoft on Windows, Apple on Mac) work fully offline
    // and are far more reliable, so we strongly prefer them.
    const isGoogleVoice = v => v.name.toLowerCase().includes('google');
    const maleKeywords = ['male','man','мужской','dmitri','dmitry','yuri','pavel','andrei','andre'];
    const isMale = v => maleKeywords.some(k => v.name.toLowerCase().includes(k));

    const ruLocalMale = voices.find(v => v.lang.startsWith('ru') && !isGoogleVoice(v) && isMale(v));
    const ruLocalAny  = voices.find(v => v.lang.startsWith('ru') && !isGoogleVoice(v));
    const ruGoogle    = voices.find(v => v.lang.startsWith('ru') && isGoogleVoice(v));
    const anyLocalMale= voices.find(v => !isGoogleVoice(v) && isMale(v));
    const anyLocal    = voices.find(v => !isGoogleVoice(v));

    return ruLocalMale || ruLocalAny || ruGoogle || anyLocalMale || anyLocal || voices[0];
  }

  // ── Voice picker UI ──
  function renderVoicePicker(){
    var menu = document.getElementById('voice-picker-menu');
    var label = document.getElementById('voice-picker-label');
    if(!menu || !label) return;
    var voices = synth.getVoices();
    if(!voices.length){ label.textContent = 'Нет голосов'; return; }

    var savedURI = localStorage.getItem('galai_voice_uri');
    var current = savedURI ? voices.find(v => v.voiceURI === savedURI) : null;
    label.textContent = current ? current.name : 'Авто (' + (pickVoice(voices)?.name || '?') + ')';

    menu.innerHTML = '';

    // "Auto" option clears the manual override.
    var autoOpt = document.createElement('div');
    autoOpt.className = 'voice-opt' + (!savedURI ? ' active' : '');
    autoOpt.innerHTML = '<div class="vo-name">✨ Авто (умный выбор)</div><div class="vo-lang">GALAI сам выберет лучший голос</div>';
    autoOpt.onclick = function(){ localStorage.removeItem('galai_voice_uri'); renderVoicePicker(); };
    menu.appendChild(autoOpt);

    // Group: Russian voices first, then the rest.
    var ru = voices.filter(v => v.lang.toLowerCase().startsWith('ru'));
    var other = voices.filter(v => !v.lang.toLowerCase().startsWith('ru'));

    function addSection(title, list){
      if(!list.length) return;
      var lbl = document.createElement('div');
      lbl.className = 'voice-section-lbl';
      lbl.textContent = title;
      menu.appendChild(lbl);
      list.forEach(function(v){
        var opt = document.createElement('div');
        var isGoogle = v.name.toLowerCase().includes('google');
        opt.className = 'voice-opt' + (savedURI === v.voiceURI ? ' active' : '');
        opt.innerHTML = '<div class="vo-name">' + (isGoogle ? '☁️' : '💻') + ' ' + v.name + '</div>' +
          '<div class="vo-lang">' + v.lang + (isGoogle ? ' · сетевой (может не работать)' : ' · локальный') + '</div>';
        opt.onclick = function(){
          localStorage.setItem('galai_voice_uri', v.voiceURI);
          renderVoicePicker();
        };
        menu.appendChild(opt);
      });
    }
    addSection('РУССКИЕ', ru);
    addSection('ДРУГИЕ ЯЗЫКИ', other);

    var testBtn = document.createElement('button');
    testBtn.id = 'voice-test-btn';
    testBtn.textContent = '▶ Проверить голос';
    testBtn.onclick = function(e){
      e.stopPropagation();
      doSpeak('Привет! Это проверка голоса GALAI.');
    };
    menu.appendChild(testBtn);
  }

  window.toggleVoicePicker = function(){
    var menu = document.getElementById('voice-picker-menu');
    renderVoicePicker();
    if(menu) menu.classList.toggle('open');
  };
  document.addEventListener('click', function(e){
    var wrap = document.getElementById('voice-picker-wrap');
    var menu = document.getElementById('voice-picker-menu');
    if(wrap && menu && !wrap.contains(e.target)) menu.classList.remove('open');
  });
  if(synth) synth.addEventListener('voiceschanged', renderVoicePicker);
  setTimeout(renderVoicePicker, 300);

  let voiceFailCount = 0;

  function doSpeak(text, onEnd){
    const utt=new SpeechSynthesisUtterance(text);
    utt.lang='ru-RU'; utt.rate=0.95; utt.pitch=0.75; utt.volume=1;
    const voices=synth.getVoices();
    const chosen=pickVoice(voices);
    if(chosen) utt.voice=chosen;
    // DEBUG: show what's actually available, directly in the UI.
    console.log('[GALAI voice debug] total voices found:', voices.length);
    console.log('[GALAI voice debug] voices list:', voices.map(v=>v.name+' ('+v.lang+')'));
    console.log('[GALAI voice debug] chosen voice:', chosen ? chosen.name+' ('+chosen.lang+')' : 'NONE - no voice assigned');
    const dbgEl = document.getElementById('voice-debug');
    if(dbgEl){
      dbgEl.textContent = 'Голосов найдено: '+voices.length+' | Выбран: '+(chosen?chosen.name:'нет голоса!');
      dbgEl.style.display='block';
    }
    let started=false;
    const startTime=Date.now();
    utt.onstart=()=>{started=true;setOrbState('speaking');startWave('#60A5FA');setVoiceStatus('GALAI говорит...','speaking');};
    utt.onend=()=>{
      const dur=Date.now()-startTime;
      // If it "ended" almost instantly for a long text, audio likely never played
      // (typical symptom of a blocked network voice).
      if(started && dur<300 && text.length>30){
        voiceFailCount++;
        if(voiceFailCount>=2){
          setVoiceTranscript('Звук не воспроизводится. Открой chrome://settings/accessibility и проверь голоса, либо установи голос Microsoft в настройках Windows (Параметры → Время и язык → Речь).','');
          voiceFailCount=0;
        }
      } else if(started){
        voiceFailCount=0;
      }
      setOrbState('');stopWave();setVoiceStatus('Нажми для разговора');onEnd&&onEnd();
    };
    utt.onerror=()=>{setOrbState('');stopWave();setVoiceStatus('Нажми для разговора');onEnd&&onEnd();};
    synth.speak(utt);
    // Chrome bug workaround: speech can silently fail to start after cancel().
    // If onstart hasn't fired shortly after, force resume + retry once.
    setTimeout(()=>{
      if(!started){
        synth.resume();
        if(!synth.speaking){
          synth.cancel();
          synth.speak(utt);
        }
      }
    },350);
    // Chrome also pauses synthesis after ~15s of silence on some systems; keep it alive.
    const keepAlive=setInterval(()=>{
      if(!synth.speaking){clearInterval(keepAlive);return;}
      if(synth.paused) synth.resume();
    },4000);
  }

  function speak(text, onEnd){
    if(!synth){onEnd&&onEnd();return;}
    synth.cancel();
    // Cancel needs a tick to fully clear before speaking again (Chrome race-condition bug).
    setTimeout(()=>{ doSpeak(text, onEnd); }, 80);
  }

  async function handleVoiceInput(text){
    if(!text.trim()||voiceLoading)return;
    addVoiceLog(text,'user');
    setVoiceTranscript(text,'user-text');
    voiceHistory.push({role:'user',content:text});
    voiceLoading=true;
    setOrbState('');stopWave();
    var usingRealAI = window.GALAI_ENGINE_READY && window.galaiRealThink;
    setVoiceStatus(usingRealAI ? 'Думаю... (GALAI ИИ)' : 'Думаю... (упрощённый режим)','');
    try{
      const reply=await callAPI([...voiceHistory]);
      voiceHistory.push({role:'assistant',content:reply});
      addVoiceLog(reply,'ai');
      setVoiceTranscript(reply,'ai-text');
      speak(reply,()=>{ voiceLoading=false; });
    }catch(e){
      setVoiceStatus('Ошибка: '+e.message,'');
      setVoiceTranscript(e.message,'');
      voiceLoading=false;
    }
  }

  window.sendVoiceTypeFallback = function(){
    var inp = document.getElementById('voice-type-input');
    var text = inp.value.trim();
    if(!text) return;
    inp.value = '';
    setVoiceTranscript(text, 'user-text');
    handleVoiceInput(text);
  };

  function toggleVoice(){
    if(voiceLoading){return;}
    if(synth.speaking){synth.cancel();setOrbState('');stopWave();setVoiceStatus('Нажми для разговора');return;}
    if(!SpeechRecognition){
      var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      setVoiceStatus('Микрофон недоступен','');
      setVoiceTranscript(
        isIOS
          ? 'Safari на iPhone/iPad не поддерживает распознавание речи. Напиши текст ниже — GALAI всё равно ответит и озвучит ответ 👇'
          : 'Этот браузер не поддерживает распознавание речи. Используй Chrome/Edge, либо напиши текст ниже 👇',
        ''
      );
      document.getElementById('voice-type-fallback').style.display = 'flex';
      document.getElementById('voice-type-input').focus();
      return;
    }
    if(recognition){recognition.stop();return;}
    recognition=new SpeechRecognition();
    recognition.lang='ru-RU';recognition.interimResults=true;recognition.maxAlternatives=1;
    recognition.onstart=()=>{setOrbState('listening');startWave('#F472B6');setVoiceStatus('Слушаю...','listening');setVoiceTranscript('','');};
    recognition.onresult=e=>{
      let interim='',final='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal) final+=e.results[i][0].transcript;
        else interim+=e.results[i][0].transcript;
      }
      setVoiceTranscript(final||interim,'user-text');
    };
    recognition.onend=e=>{
      const transcript=document.getElementById('voice-transcript').textContent.trim();
      recognition=null;setOrbState('');stopWave();
      if(transcript) handleVoiceInput(transcript);
      else setVoiceStatus('Нажми для разговора');
    };
    recognition.onerror=e=>{recognition=null;setOrbState('');stopWave();setVoiceStatus('Нажми для разговора');};
    recognition.start();
  }

  // ── Input events ──
  const msgInput=document.getElementById('msg-input');
  msgInput.addEventListener('input',()=>{msgInput.style.height='auto';msgInput.style.height=Math.min(msgInput.scrollHeight,160)+'px';updateSendBtn();});
  msgInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
  document.getElementById('send-btn').addEventListener('click',sendMessage);

  // API key not needed

  // ── New project ──
  document.getElementById('new-project-btn').addEventListener('click',()=>{
    document.getElementById('new-project-btn').style.display='none';
    document.getElementById('new-project-form').style.display='flex';
    document.getElementById('new-project-name-input').focus();
  });
  document.getElementById('new-project-confirm').addEventListener('click',()=>addProject(document.getElementById('new-project-name-input').value));
  document.getElementById('new-project-name-input').addEventListener('keydown',e=>{if(e.key==='Enter')addProject(e.target.value);if(e.key==='Escape')hideNewProjectForm();});
  function hideNewProjectForm(){document.getElementById('new-project-btn').style.display='block';document.getElementById('new-project-form').style.display='none';document.getElementById('new-project-name-input').value='';}

  // load voices async
  if(synth) synth.addEventListener('voiceschanged',()=>{});

  // ── Init ──
  renderAll();
  switchTab('chat');


  // ─── Model picker UI + status bar (always defined, regardless of whether
  // the WebLLM import below succeeds) ───────────────────────────────────
  window.GALAI_ENGINE = null;
  window.GALAI_ENGINE_READY = false;
  window.GALAI_ENGINE_FAILED = false;
  window.GALAI_ENGINE_SWITCHING = false;

  window.MODEL_INFO = [
    {id:"Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label:"Qwen 0.5B", desc:"Самая быстрая · слабее в сложных ответах", emoji:"⚡"},
    {id:"Llama-3.2-1B-Instruct-q4f32_1-MLC", label:"Llama 3.2 1B", desc:"Баланс скорости и качества", emoji:"⚖️"},
    {id:"Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label:"Qwen 1.5B", desc:"Умнее · медленнее", emoji:"🧩"},
    {id:"gemma-2-2b-it-q4f16_1-MLC", label:"Gemma 2 2B", desc:"Самая умная · самая медленная", emoji:"🐢"},
    {id:"SmolLM2-1.7B-Instruct-q4f16_1-MLC", label:"SmolLM2 1.7B", desc:"Альтернатива среднего размера", emoji:"🧩"}
  ];
  window.MODEL_CANDIDATES = window.MODEL_INFO.map(function(m){ return m.id; });

  function setAiStatus(text, pct, mode){
    var bar = document.getElementById('ai-status-bar');
    var txt = document.getElementById('ai-status-text');
    var fill = document.getElementById('ai-progress-fill');
    var pctEl = document.getElementById('ai-progress-pct');
    var retryBtn = document.getElementById('ai-retry-btn');
    var dismissBtn = document.getElementById('ai-dismiss-btn');
    if(!bar) return;
    bar.classList.remove('hidden');
    bar.className = (mode || '');
    txt.textContent = text;
    if(typeof pct === 'number'){
      fill.style.width = Math.round(pct*100)+'%';
      pctEl.textContent = Math.round(pct*100)+'%';
      pctEl.style.display = 'inline';
      fill.parentElement.style.display = 'block';
    } else {
      pctEl.style.display = 'none';
      fill.parentElement.style.display = 'none';
    }
    if(retryBtn) retryBtn.style.display = (mode === 'error') ? 'inline-block' : 'none';
    if(dismissBtn) dismissBtn.style.display = (mode === 'error') ? 'inline-block' : 'none';
  }
  window.setAiStatus = setAiStatus;

  function modelLabel(id){
    var info = window.MODEL_INFO.find(function(m){ return m.id === id; });
    return info ? info.label : id;
  }

  function updateModelPickerUI(){
    var labelEl = document.getElementById('model-picker-label');
    if(labelEl){
      if(window.GALAI_ENGINE_READY) labelEl.textContent = modelLabel(window.GALAI_MODEL_USED);
      else if(window.GALAI_ENGINE_SWITCHING) labelEl.textContent = 'Переключение...';
      else if(window.GALAI_ENGINE_FAILED) labelEl.textContent = 'Недоступен';
      else labelEl.textContent = 'Загрузка...';
    }
    var menu = document.getElementById('model-picker-menu');
    if(!menu) return;
    menu.innerHTML = '';
    window.MODEL_INFO.forEach(function(info){
      var opt = document.createElement('div');
      opt.className = 'model-opt' + (info.id === window.GALAI_MODEL_USED ? ' active' : '');
      opt.innerHTML = '<div class="mo-name">' + info.emoji + ' ' + info.label + '</div>' +
        '<div class="mo-desc">' + info.desc + '</div>';
      opt.onclick = function(){ window.switchModel(info.id); };
      menu.appendChild(opt);
    });
  }
  window.updateModelPickerUI = updateModelPickerUI;

  window.toggleModelPicker = function(){
    var menu = document.getElementById('model-picker-menu');
    if(menu) menu.classList.toggle('open');
  };
  document.addEventListener('click', function(e){
    var wrap = document.getElementById('model-picker-wrap');
    var menu = document.getElementById('model-picker-menu');
    if(wrap && menu && !wrap.contains(e.target)) menu.classList.remove('open');
  });

  // Placeholder until the real engine module finishes loading (or fails) -
  // clicking a model before that just explains what's happening instead of
  // throwing "not a function".
  window.switchModel = function(modelId){
    setAiStatus('ИИ-модуль ещё не готов. Подожди загрузку или обнови страницу.', null, '');
  };

  function describeError(err){
    var msg = (err && (err.message || String(err))) || 'неизвестная ошибка';
    if(/ShaderModule|compute stage|entryPoint/i.test(msg)){
      return 'Драйвер видеокарты не смог скомпилировать шейдер этой модели (баг в экспериментальной поддержке WebGPU после включения unsafe-флага). Это проблема драйвера, не настроек сайта. Попробуй: 1) обновить драйвер видеокарты, 2) перезагрузить компьютер, 3) или просто используй Llama 3.2 1B — она работает без экспериментальных функций. [' + msg + ']';
    }
    if(/shader-f16/i.test(msg)){
      var hasWorkingF32Model = window.GALAI_ENGINE_READY || window.GALAI_MODEL_USED;
      if(hasWorkingF32Model){
        return 'Эта модель требует функцию shader-f16, которую твоя видеокарта/драйвер не поддерживает физически (не лечится флагами в chrome://flags). Используй модель без "f16" в названии — например Llama 3.2 1B, которая у тебя уже работает. [' + msg + ']';
      }
      return 'Эта модель требует функцию видеокарты shader-f16. Сначала попробуй включить chrome://flags/#enable-unsafe-webgpu и перезапустить браузер. Если после этого ошибка останется — значит видеокарта физически не поддерживает f16-вычисления, и нужно выбрать модель без "f16" в названии (например Llama 3.2 1B). [' + msg + ']';
    }
    if(/CORS|Failed to fetch|NetworkError|ERR_/i.test(msg))
      return 'Сеть блокирует загрузку (CORS/файрвол/нет интернета). [' + msg + ']';
    if(/not found|Unknown model|invalid model/i.test(msg))
      return 'Эта версия WebLLM не знает такую модель. [' + msg + ']';
    if(/WebGPU|adapter|device/i.test(msg))
      return 'Видеокарта/драйвер не поддерживает нужные функции WebGPU. [' + msg + ']';
    if(/out of memory|OOM/i.test(msg))
      return 'Не хватает видеопамяти для этой модели. [' + msg + ']';
    return msg;
  }
  window.describeError = describeError;

  updateModelPickerUI();


  // ─── Real local AI via WebLLM (runs a small LLM fully in-browser, no API
  // key). The import is wrapped in try/catch: if the CDN/network is blocked,
  // this whole block fails gracefully instead of breaking the UI functions
  // defined above (which stay usable so buttons never throw "not defined"). ───
  (async function(){
    var webllm;
    // esm.run can be blocked/flaky on some networks - try a few mirrors.
    var CDN_URLS = [
      "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm",
      "https://esm.sh/@mlc-ai/web-llm",
      "https://esm.run/@mlc-ai/web-llm",
      "https://unpkg.com/@mlc-ai/web-llm?module"
    ];
    var lastImportErr = null;
    for(const url of CDN_URLS){
      try {
        window.setAiStatus('Подключаюсь к ' + new URL(url).hostname + '...', null, '');
        webllm = await import(url);
        break;
      } catch(err){
        console.error('GALAI: CDN failed:', url, err);
        lastImportErr = err;
      }
    }
    if(!webllm){
      console.error('GALAI: failed to load WebLLM library from any CDN:', lastImportErr);
      window.GALAI_ENGINE_FAILED = true;
      window.setAiStatus('Не удалось скачать библиотеку ИИ ни с одного источника. Проверь интернет/файрвол, или убедись что открываешь файл напрямую в браузере, а не внутри claude.ai. ' + window.describeError(lastImportErr), null, 'error');
      window.updateModelPickerUI();
      return;
    }

    // Build the model picker list from models that ACTUALLY exist in this
    // loaded version of WebLLM, instead of a hand-typed guess that can go
    // stale when the library updates its prebuilt model IDs.
    // raw.githubusercontent.com (where the .wasm compute libraries live) is
    // blocked/throttled on some networks (e.g. Roskomnadzor-restricted ISPs)
    // even when huggingface.co (where the weights live) works fine. jsDelivr
    // mirrors the same GitHub repo content from different infrastructure, so
    // we rewrite model_lib URLs to go through it instead.
    const GH_RAW_PREFIX = "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/";
    const JSDELIVR_GH_PREFIX = "https://cdn.jsdelivr.net/gh/mlc-ai/binary-mlc-llm-libs@main/";

    function mirrorModelLib(url){
      if(url && url.indexOf(GH_RAW_PREFIX) === 0){
        return JSDELIVR_GH_PREFIX + url.slice(GH_RAW_PREFIX.length);
      }
      return url;
    }

    (function buildModelInfoFromLibrary(){
      var all = (webllm.prebuiltAppConfig && webllm.prebuiltAppConfig.model_list) || [];
      var wanted = [
        {match: /^Qwen2\.5-0\.5B-Instruct-q4f16/i, label:"Qwen 0.5B", desc:"Быстрая · нужен f16 (может не работать)", emoji:"⚡"},
        {match: /^Llama-3\.2-1B-Instruct-q4f32/i, label:"Llama 3.2 1B", desc:"Без f16 · самый надёжный вариант", emoji:"✅"},
        {match: /^Qwen2\.5-1\.5B-Instruct-q4f16/i, label:"Qwen 1.5B", desc:"Умнее · нужен f16 (может не работать)", emoji:"🧩"},
        {match: /^gemma-2-2b-it/i, label:"Gemma 2 2B", desc:"Самая умная · нужен f16 (может не работать)", emoji:"🐢"},
        {match: /^SmolLM2-1\.7B-Instruct/i, label:"SmolLM2 1.7B", desc:"Альтернатива · нужен f16 (может не работать)", emoji:"🧩"},
        {match: /^Phi-3\.5-mini-instruct/i, label:"Phi 3.5 mini", desc:"Хорошее качество · нужен f16 (может не работать)", emoji:"🧩"},
        {match: /^TinyLlama-1\.1B/i, label:"TinyLlama 1.1B", desc:"Лёгкая · нужен f16 (может не работать)", emoji:"⚡"},
      ];
      var found = [];
      var mirroredRecords = [];
      wanted.forEach(function(w){
        var rec = all.find(function(m){ return w.match.test(m.model_id); });
        if(rec){
          found.push({id: rec.model_id, label: w.label, desc: w.desc, emoji: w.emoji});
          mirroredRecords.push(Object.assign({}, rec, { model_lib: mirrorModelLib(rec.model_lib) }));
        }
      });
      if(found.length){
        window.MODEL_INFO = found;
        window.MODEL_CANDIDATES = found.map(function(m){ return m.id; });
        console.log('GALAI: model list resolved from library:', window.MODEL_CANDIDATES);
      } else {
        console.warn('GALAI: none of the expected models matched this library version.');
      }
      // ONE shared appConfig containing every candidate model, mirrored.
      // Reusing this same object for the initial load AND every later switch
      // (instead of building a fresh single-model config each time) avoids
      // WebLLM losing track of models that weren't part of the very first
      // config it was constructed with.
      window.GALAI_APP_CONFIG = { model_list: mirroredRecords };
      window.updateModelPickerUI();
    })();

    const SYSTEM_PROMPT =
      "Тебя зовут GALAI. Тебя создала компания GALAXYCOPP. " +
      "Ты дружелюбный ИИ-помощник, отвечаешь на русском языке кратко и по делу. " +
      "Если тебя спрашивают кто тебя создал или как тебя зовут — отвечай именно это. " +
      "Никогда не упоминай Anthropic, Claude, OpenAI, Qwen или другие компании/модели — ты просто GALAI.";

    const CODE_SYSTEM_PROMPT =
      "Тебя зовут GALAI, тебя создала компания GALAXYCOPP. Ты опытный программист. " +
      "Когда тебя просят написать, создать или переделать код (игру, скрипт, программу) — " +
      "пиши ПОЛНЫЙ рабочий код целиком в одном блоке ```язык ... ```, без сокращений и заглушек " +
      "вроде '// остальной код тут'. Если просят переделать или исправить уже написанный код " +
      "(смотри историю переписки) — бери именно тот код, который дал раньше, и редактируй именно его, " +
      "а не пиши с нуля что-то другое. После кода коротко (1-2 предложения) объясни что сделал. " +
      "Отвечай на русском. Никогда не упоминай Anthropic, Claude, OpenAI, Qwen — ты просто GALAI.";

    async function tryLoadModel(modelId){
      window.setAiStatus('Загружаю модель ' + modelLabel2(modelId) + '...', 0, '');
      var opts = {
        initProgressCallback: (report) => {
          window.setAiStatus((report.text || 'Загружаю модель...'), report.progress || 0, '');
        }
      };
      if(window.GALAI_APP_CONFIG && window.GALAI_APP_CONFIG.model_list.length){
        opts.appConfig = window.GALAI_APP_CONFIG;
      }
      const engine = await webllm.CreateMLCEngine(modelId, opts);
      return engine;
    }

    function modelLabel2(id){
      var info = window.MODEL_INFO.find(m => m.id === id);
      return info ? info.label : id;
    }

    function isMobileDevice(){
      return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
    }

    async function initGalaiEngine(){
      if(!navigator.gpu){
        window.GALAI_ENGINE_FAILED = true;
        if(isMobileDevice()){
          window.setAiStatus('📱 На телефонах настоящая локальная модель пока не работает (нет WebGPU) — но погода, поиск в интернете и умные ответы работают отлично!', null, '');
          setTimeout(()=>{ const b=document.getElementById('ai-status-bar'); if(b) b.classList.add('hidden'); }, 6000);
        } else {
          window.setAiStatus('WebGPU не поддерживается этим браузером — использую упрощённые ответы. Нужен свежий Chrome или Edge (desktop).', null, 'error');
        }
        window.updateModelPickerUI();
        return;
      }

      const saved = localStorage.getItem('galai_model_id');
      const order = saved
        ? [saved].concat(window.MODEL_CANDIDATES.filter(m => m !== saved))
        : window.MODEL_CANDIDATES;

      var lastErr = null;
      for(const modelId of order){
        try {
          const engine = await tryLoadModel(modelId);
          window.GALAI_ENGINE = engine;
          window.GALAI_ENGINE_READY = true;
          window.GALAI_MODEL_USED = modelId;
          localStorage.setItem('galai_model_id', modelId);
          window.updateModelPickerUI();
          window.setAiStatus('Готово! ' + modelLabel2(modelId) + ' загружена. GALAI теперь думает по-настоящему 🧠', 1, 'ready');
          setTimeout(()=>{ const b=document.getElementById('ai-status-bar'); if(b) b.classList.add('hidden'); }, 4000);
          return;
        } catch(err){
          console.error('GALAI: model failed:', modelId, err);
          lastErr = err;
        }
      }

      window.GALAI_ENGINE_FAILED = true;
      const reason = window.describeError(lastErr);
      console.error('GALAI: all model candidates failed. Last error:', lastErr);
      window.setAiStatus('Не удалось загрузить ИИ-модель: ' + reason, null, 'error');
      window.updateModelPickerUI();
    }

    async function switchModel(modelId){
      document.getElementById('model-picker-menu')?.classList.remove('open');
      if(modelId === window.GALAI_MODEL_USED && window.GALAI_ENGINE_READY) return;
      window.GALAI_ENGINE_SWITCHING = true;
      window.GALAI_ENGINE_READY = false;
      window.updateModelPickerUI();
      try {
        window.setAiStatus('Переключаюсь на ' + modelLabel2(modelId) + '...', 0, '');
        if(window.GALAI_ENGINE && window.GALAI_ENGINE.reload){
          if(window.GALAI_ENGINE.setInitProgressCallback){
            window.GALAI_ENGINE.setInitProgressCallback((report) =>
              window.setAiStatus(report.text || 'Загружаю...', report.progress || 0, ''));
          }
          var cfg = (window.GALAI_APP_CONFIG && window.GALAI_APP_CONFIG.model_list.length) ? window.GALAI_APP_CONFIG : undefined;
          await window.GALAI_ENGINE.reload(modelId, undefined, cfg);
        } else {
          window.GALAI_ENGINE = await tryLoadModel(modelId);
        }
        window.GALAI_MODEL_USED = modelId;
        window.GALAI_ENGINE_READY = true;
        window.GALAI_ENGINE_SWITCHING = false;
        localStorage.setItem('galai_model_id', modelId);
        window.updateModelPickerUI();
        window.setAiStatus('Готово! ' + modelLabel2(modelId) + ' загружена 🧠', 1, 'ready');
        setTimeout(()=>{ const b=document.getElementById('ai-status-bar'); if(b) b.classList.add('hidden'); }, 3000);
      } catch(err){
        console.error('GALAI: switchModel failed:', modelId, err);
        window.GALAI_ENGINE_SWITCHING = false;
        window.GALAI_ENGINE_READY = !!window.GALAI_ENGINE;
        window.updateModelPickerUI();
        window.setAiStatus('Не удалось переключиться на ' + modelLabel2(modelId) + ': ' + window.describeError(err), null, 'error');
      }
    }
    window.switchModel = switchModel;

    function trimRepeats(text){
      if(!text || text.length < 120) return text;
      const chunkLen = 60;
      for(let i = 0; i + chunkLen*2 <= text.length; i += 20){
        const chunk = text.slice(i, i + chunkLen);
        const next = text.indexOf(chunk, i + chunkLen);
        if(next !== -1 && next < i + chunkLen + 10){
          return text.slice(0, next).trimEnd();
        }
      }
      return text;
    }

    window.galaiRealThink = async function(messages, opts){
      if(!window.GALAI_ENGINE_READY || !window.GALAI_ENGINE) throw new Error('engine-not-ready');
      var forCode = opts && opts.forCode;
      var onChunk = opts && opts.onChunk;
      var sys = forCode ? CODE_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const chatMsgs = [{role:'system', content: sys}].concat(
        messages.map(m => ({role: m.role==='user' ? 'user' : 'assistant', content: m.content}))
      );
      const genOpts = {
        messages: chatMsgs,
        temperature: forCode ? 0.3 : 0.7,
        max_tokens: forCode ? 900 : 280,
        repetition_penalty: forCode ? 1.3 : 1.2,
        frequency_penalty: forCode ? 0.4 : 0.3,
        presence_penalty: 0.2
      };

      if(!onChunk){
        const result = await window.GALAI_ENGINE.chat.completions.create(genOpts);
        return trimRepeats(result.choices[0].message.content);
      }

      genOpts.stream = true;
      const stream = await window.GALAI_ENGINE.chat.completions.create(genOpts);
      let full = '';
      for await (const chunk of stream){
        const delta = chunk.choices[0]?.delta?.content || '';
        if(delta){
          full += delta;
          onChunk(trimRepeats(full));
        }
      }
      return trimRepeats(full);
    };

    window.initGalaiEngine = initGalaiEngine;
    initGalaiEngine();
  })();


if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./service-worker.js').catch(function(err){ console.warn('SW failed', err); });
  });
}
