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
  const c = chat();
  if(!c) return;

  c.messages.push({ role: 'user', text });

  if(c.title === 'Первый чат' && text.length){
    c.title = text.slice(0, 28);
  }

  save();
  render();

  const thinking = {
    role: 'assistant',
    text: 'Думаю...'
  };

  c.messages.push(thinking);
  renderMessages();

  try{
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        history: c.messages.slice(0, -1),
        useSearch: true
      })
    });

    const data = await r.json();

    thinking.text =
      data.answer ||
      data.error ||
      'Ошибка ответа';

  } catch(e){

    thinking.text =
      'Ошибка соединения с сервером: ' + e.message;

  }

  save();
  renderMessages();
}
