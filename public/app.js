import { GalaiCore } from "./galai-core.js";
const $ = (id) => document.getElementById(id);
const STORAGE = 'galai_3_state_v1';
let backendStatus = { gemini:false, googleSearch:false, model:null };

let state = loadState();
let activeProjectId = state.activeProjectId;
let activeChatId = state.activeChatId;
let listening = false;
let recognition = null;

function defaultState(){
  const now = Date.now();
  return {
    activeProjectId: 'p1',
    activeChatId: 'c1',
    projects: [{ id:'p1', name:'Личное', chats:[{ id:'c1', title:'Первый чат', messages:[{role:'assistant', text:'Привет! Я GALAI 3.1 с поддержкой Gemini API. Спроси меня что угодно.'}] }] }],
    createdAt: now
  };
}
function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE)) || defaultState(); } catch { return defaultState(); }
}
function save(){ state.activeProjectId = activeProjectId; state.activeChatId = activeChatId; localStorage.setItem(STORAGE, JSON.stringify(state)); }
function project(){ return state.projects.find(p => p.id === activeProjectId) || state.projects[0]; }
function chat(){ const p = project(); return p?.chats.find(c => c.id === activeChatId) || p?.chats[0]; }
function id(prefix){ return prefix + Math.random().toString(36).slice(2,9); }

function renderProjects(){
  const box = $('projects'); box.innerHTML = '';
  state.projects.forEach(p => {
    const wrap = document.createElement('div'); wrap.className = 'project';
    const head = document.createElement('button'); head.className = 'project-head'; head.innerHTML = `<span>${escapeHtml(p.name)}</span><span>▾</span>`;
    head.onclick = () => { activeProjectId = p.id; activeChatId = p.chats[0]?.id; closeMenu(); save(); render(); };
    wrap.appendChild(head);
    p.chats.forEach(c => {
      const b = document.createElement('button'); b.className = 'chat-item' + (c.id === activeChatId ? ' active' : ''); b.textContent = c.title;
      b.onclick = () => { activeProjectId = p.id; activeChatId = c.id; closeMenu(); save(); render(); };
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
  });
}

function renderMessages(){
  const c = chat();
  $('activeProject').textContent = project()?.name || 'Проект';
  $('activeChatTitle').textContent = c?.title || 'GALAI';
  const box = $('messages'); box.innerHTML = '';
  (c?.messages || []).forEach(m => addMessageToDom(m.role, m.text));
  box.scrollTop = box.scrollHeight;
}
function addMessageToDom(role, text){
  const row = document.createElement('div'); row.className = 'msg ' + role;
  if(role !== 'user') { const av = document.createElement('div'); av.className='avatar'; av.textContent='✦'; row.appendChild(av); }
  const b = document.createElement('div'); b.className='bubble'; b.innerHTML = linkify(escapeHtml(text)); row.appendChild(b);
  $('messages').appendChild(row);
}
function render(){ renderProjects(); renderMessages(); }

async function loadStatus(){
  try{
    const r = await fetch('/api/status');
    backendStatus = await r.json();
    const el = $('statusBadge');
    if(el){
      const g = backendStatus.gemini ? 'Gemini ✓' : 'Gemini нет';
      const s = backendStatus.googleSearch ? 'Google ✓' : 'Поиск fallback';
      el.textContent = `${g} · ${s}`;
      el.title = backendStatus.model ? `Модель: ${backendStatus.model}` : '';
    }
  }catch{}
}

async function sendMessage(text){
  const c = chat(); if(!c) return;
  c.messages.push({role:'user', text});
  if(c.title === 'Первый чат' && text.length) c.title = text.slice(0, 28);
  save(); render();
  const thinking = { role:'assistant', text:'Думаю...' };
  c.messages.push(thinking); renderMessages();
  try{
    const data = await GalaiCore.ask({
  message: text,
  history: c.messages.slice(0, -1)
});

thinking.text = data.answer || data.error || "Ошибка ответа";

$('chatForm').addEventListener('submit', (e)=>{
  e.preventDefault(); const input = $('messageInput'); const text = input.value.trim(); if(!text) return; input.value=''; autoGrow(input); sendMessage(text);
});
$('messageInput').addEventListener('input', e => autoGrow(e.target));
$('messageInput').addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); $('chatForm').requestSubmit(); } });
function autoGrow(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,160)+'px'; }

$('newChatBtn').onclick = () => { const p = project(); const c = {id:id('c'), title:'Новый чат', messages:[{role:'assistant', text:'Новый чат создан. Чем помочь?'}]}; p.chats.unshift(c); activeChatId=c.id; save(); render(); };
$('newProjectBtn').onclick = () => { const name = prompt('Название проекта:', 'Новый проект'); if(!name) return; const p={id:id('p'), name, chats:[{id:id('c'), title:'Первый чат', messages:[{role:'assistant', text:'Проект создан. Задай вопрос.'}]}]}; state.projects.unshift(p); activeProjectId=p.id; activeChatId=p.chats[0].id; save(); render(); };

function openMenu(){ $('sidebar').classList.add('open'); $('backdrop').classList.add('open'); }
function closeMenu(){ $('sidebar').classList.remove('open'); $('backdrop').classList.remove('open'); }
$('menuBtn').onclick = openMenu; $('backdrop').onclick = closeMenu;

$('chatTabBtn').onclick = () => switchView('chat');
$('voiceTabBtn').onclick = () => switchView('voice');
function switchView(name){
  $('chatView').classList.toggle('hidden', name!=='chat');
  $('voiceView').classList.toggle('hidden', name!=='voice');
  $('chatTabBtn').classList.toggle('active', name==='chat');
  $('voiceTabBtn').classList.toggle('active', name==='voice');
}

function setupVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ $('voiceStatus').textContent='Голосовой ввод недоступен. Используй поле ниже.'; return; }
  recognition = new SR(); recognition.lang = 'ru-RU'; recognition.interimResults = true; recognition.continuous = false;
  recognition.onstart = () => { listening=true; $('voiceOrb').classList.add('listening'); $('voiceStatus').textContent='Слушаю...'; };
  recognition.onend = () => { listening=false; $('voiceOrb').classList.remove('listening'); $('voiceStatus').textContent='Нажми на микрофон'; };
  recognition.onerror = (e) => { $('voiceStatus').textContent='Ошибка голоса: ' + (e.error || 'unknown'); };
  recognition.onresult = (e) => {
    let text=''; for(let i=0;i<e.results.length;i++) text += e.results[i][0].transcript;
    $('voiceTranscript').textContent = text;
    if(e.results[e.results.length-1].isFinal && text.trim()) { switchView('chat'); sendMessage(text.trim()); }
  };
}
$('voiceOrb').onclick = () => { if(!recognition) return; try { listening ? recognition.stop() : recognition.start(); } catch(e){ $('voiceStatus').textContent='Не удалось запустить голос. Открой в Safari/Chrome.'; } };
$('voiceFallbackForm').onsubmit = (e) => { e.preventDefault(); const v=$('voiceFallbackInput').value.trim(); if(!v) return; $('voiceFallbackInput').value=''; switchView('chat'); sendMessage(v); };

function escapeHtml(s){ return String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function linkify(s){ return s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }

if('serviceWorker' in navigator){ navigator.serviceWorker.register('/service-worker.js').catch(()=>{}); }
loadStatus();
setupVoice(); render();
