const $ = id => document.getElementById(id);
const STORAGE = 'galai_4_state_v1';

let state = JSON.parse(localStorage.getItem(STORAGE) || 'null') || {
  activeProjectId: 'p1',
  activeChatId: 'c1',
  projects: [{
    id: 'p1',
    name: 'Личное',
    chats: [{
      id: 'c1',
      title: 'Первый чат',
      messages: [{ role: 'assistant', text: 'Привет! Я GALAI 4.0. Чем помочь?' }]
    }]
  }]
};

let activeProjectId = state.activeProjectId;
let activeChatId = state.activeChatId;
let recognition = null;
let listening = false;
let selectedFile = null;
let uploadedFileText = "";

function save() {
  state.activeProjectId = activeProjectId;
  state.activeChatId = activeChatId;
  localStorage.setItem(STORAGE, JSON.stringify(state));
}

function uid(p) {
  return p + Math.random().toString(36).slice(2, 9);
}

function project() {
  return state.projects.find(p => p.id === activeProjectId) || state.projects[0];
}

function chat() {
  const p = project();
  return p.chats.find(c => c.id === activeChatId) || p.chats[0];
}

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));
}

function linkify(s) {
  return esc(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
}

function renderProjects() {
  const box = $('projects');
  box.innerHTML = '';

  state.projects.forEach(p => {
    const wrap = document.createElement('div');
    wrap.className = 'project';

    const head = document.createElement('button');
    head.className = 'project-head';
    head.innerHTML = `<span>${esc(p.name)}</span><span>▾</span>`;
    head.onclick = () => {
      activeProjectId = p.id;
      activeChatId = p.chats[0].id;
      save();
      render();
      closeMenu();
    };

    wrap.appendChild(head);

    p.chats.forEach(c => {
      const b = document.createElement('button');
      b.className = 'chat-item' + (c.id === activeChatId ? ' active' : '');
      b.textContent = c.title;
      b.onclick = () => {
        activeProjectId = p.id;
        activeChatId = c.id;
        save();
        render();
        closeMenu();
      };
      wrap.appendChild(b);
    });

    box.appendChild(wrap);
  });
}

function renderMessages() {
  const c = chat();

  $('activeProject').textContent = project().name;
  $('activeChatTitle').textContent = c.title;

  const box = $('messages');
  box.innerHTML = '';

  c.messages.forEach(m => {
    const row = document.createElement('div');
    row.className = 'msg ' + m.role;

    if (m.role !== 'user') {
      const av = document.createElement('div');
      av.className = 'avatar';
      av.textContent = '✦';
      row.appendChild(av);
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = linkify(m.text);
    row.appendChild(bubble);

    box.appendChild(row);
  });

  box.scrollTop = box.scrollHeight;
}

function render() {
  renderProjects();
  renderMessages();
}

async function loadStatus() {
  try {
    const r = await fetch('/api/status');
    const data = await r.json();

    const g = data.gemini ? 'Gemini ✓' : 'Gemini нет';
    const s = data.googleSearch ? 'Google ✓' : 'Поиск fallback';

    $('statusBadge').textContent = `${g} · ${s}`;
    $('statusBadge').title = data.model || '';
  } catch {
    $('statusBadge').textContent = 'API недоступен';
  }
}

async function sendMessage(text) {
  const c = chat();

  c.messages.push({ role: 'user', text });

  if (c.title === 'Первый чат' || c.title === 'Новый чат') {
    c.title = text.slice(0, 28);
  }

  const thinking = { role: 'assistant', text: 'Думаю...' };
  c.messages.push(thinking);

  save();
  render();

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: c.messages.slice(0, -1),
        useSearch: true
      })
    });

    const data = await r.json();
    thinking.text = data.answer || data.error || 'Ошибка ответа';
  } catch (e) {
    thinking.text = 'Ошибка соединения: ' + e.message;
  }

  save();
  render();
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function newChat() {
  const p = project();
  const c = {
    id: uid('c'),
    title: 'Новый чат',
    messages: [{ role: 'assistant', text: 'Новый чат создан. Чем помочь?' }]
  };

  p.chats.unshift(c);
  activeChatId = c.id;
  save();
  render();
}

function newProject() {
  const name = prompt('Название проекта:', 'Новый проект');
  if (!name) return;

  const p = {
    id: uid('p'),
    name,
    chats: [{
      id: uid('c'),
      title: 'Первый чат',
      messages: [{ role: 'assistant', text: 'Проект создан. Задай вопрос.' }]
    }]
  };

  state.projects.unshift(p);
  activeProjectId = p.id;
  activeChatId = p.chats[0].id;
  save();
  render();
}

function openMenu() {
  $('sidebar').classList.add('open');
  $('backdrop').classList.add('open');
}

function closeMenu() {
  $('sidebar').classList.remove('open');
  $('backdrop').classList.remove('open');
}

function switchView(name) {
  $('chatView').classList.toggle('hidden', name !== 'chat');
  $('voiceView').classList.toggle('hidden', name !== 'voice');
  $('chatTabBtn').classList.toggle('active', name === 'chat');
  $('voiceTabBtn').classList.toggle('active', name === 'voice');
}

function setupVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    $('voiceStatus').textContent = 'Голосовой ввод недоступен.';
    return;
  }

  recognition = new SR();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true;

  recognition.onstart = () => {
    listening = true;
    $('voiceOrb').classList.add('listening');
    $('voiceStatus').textContent = 'Слушаю...';
  };

  recognition.onend = () => {
    listening = false;
    $('voiceOrb').classList.remove('listening');
    $('voiceStatus').textContent = 'Нажми на микрофон';
  };

  recognition.onresult = e => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
    }

    $('voiceTranscript').textContent = text;

    if (e.results[e.results.length - 1].isFinal && text.trim()) {
      switchView('chat');
      sendMessage(text.trim());
    }
  };
}

function bindEvents() {
  $('chatForm').onsubmit = e => {
    e.preventDefault();

    const input = $('messageInput');
    const text = input.value.trim();

    if (!text) return;

    input.value = '';
    autoGrow(input);
    sendMessage(text);
  };

  const fileInput = $('fileInput');
  
  selectedFile = file;
uploadedFileText = "";
const attachedFile = $('attachedFile');

if (fileInput) {
    fileInput.onchange = () => {

        if (!fileInput.files.length) {
            attachedFile.classList.add("hidden");
            return;
        }

const file = fileInput.files[0];

selectedFile = file;
uploadedFileText = "";

attachedFile.classList.remove("hidden");
attachedFile.textContent =
    "📄 " +
    file.name +
    " (" +
    Math.round(file.size / 1024) +
    " KB)";
  $('messageInput').oninput = e => autoGrow(e.target);

  $('messageInput').onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('chatForm').requestSubmit();
    }
  };

  $('newChatBtn').onclick = newChat;
  $('newProjectBtn').onclick = newProject;
  $('menuBtn').onclick = openMenu;
  $('backdrop').onclick = closeMenu;
  $('chatTabBtn').onclick = () => switchView('chat');
  $('voiceTabBtn').onclick = () => switchView('voice');

  $('voiceOrb').onclick = () => {
    if (!recognition) return;
    listening ? recognition.stop() : recognition.start();
  };

  $('voiceFallbackForm').onsubmit = e => {
    e.preventDefault();

    const input = $('voiceFallbackInput');
    const text = input.value.trim();

    if (!text) return;

    input.value = '';
    switchView('chat');
    sendMessage(text);
  };
}

function init() {
  bindEvents();
  
  coreInfo();
  
  loadStatus();
  setupVoice();
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

function coreInfo() {
    if (!window.GalaiCore) {
        console.warn("GALAI Core не подключен");
        return;
    }

    console.log(
        "GALAI Core",
        window.GalaiCore.version
    );
}

document.addEventListener('DOMContentLoaded', init);
