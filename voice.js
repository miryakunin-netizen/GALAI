import { localReply } from './search.js';

export function initVoice({onUserText, onAssistantText}){
  const orb = document.getElementById('voice-orb');
  const status = document.getElementById('voice-status');
  const transcript = document.getElementById('voice-transcript');
  const warning = document.getElementById('voice-warning');
  const fallback = document.getElementById('voice-fallback');
  const input = document.getElementById('voice-text-input');
  const send = document.getElementById('voice-text-send');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  let rec = null;

  function say(text){
    transcript.textContent = text;
    onAssistantText?.(text);
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 700));
      u.lang = 'ru-RU';
      orb.classList.add('speaking');
      u.onend = () => orb.classList.remove('speaking');
      speechSynthesis.speak(u);
    } catch {}
  }
  async function handleText(text){
    const clean = text.trim(); if(!clean) return;
    transcript.textContent = 'Вы: ' + clean;
    onUserText?.(clean);
    status.textContent = 'Думаю...';
    const reply = await localReply(clean);
    status.textContent = 'Готово';
    say(reply);
  }
  function showFallback(msg){
    warning.textContent = msg || '';
    fallback.classList.add('open');
  }

  if (!SR) showFallback('На этом устройстве голосовое распознавание недоступно. Можно писать текстом ниже.');
  if (isIOS && isStandalone) showFallback('На iPhone голос часто не работает из иконки на экране. Открой GALAI в Safari.');

  orb.addEventListener('click', () => {
    if (!SR) return showFallback('Голосовое распознавание недоступно. Используй поле ниже.');
    try {
      if (rec) { rec.stop(); rec = null; return; }
      rec = new SR(); rec.lang='ru-RU'; rec.interimResults=false; rec.continuous=false;
      rec.onstart = () => { status.textContent='Слушаю...'; orb.classList.add('listening'); warning.textContent=''; };
      rec.onerror = e => { status.textContent='Ошибка голоса'; orb.classList.remove('listening'); showFallback('Не удалось запустить микрофон: ' + (e.error || 'unknown')); rec=null; };
      rec.onend = () => { orb.classList.remove('listening'); if(status.textContent==='Слушаю...') status.textContent='Нажми на микрофон'; rec=null; };
      rec.onresult = e => handleText(e.results[0][0].transcript || '');
      rec.start();
    } catch(e){ showFallback('Safari заблокировал голос. Открой сайт в Safari и разреши микрофон.'); rec=null; }
  });
  send.addEventListener('click', () => handleText(input.value));
  input.addEventListener('keydown', e => { if(e.key==='Enter'){ handleText(input.value); input.value=''; } });
}
