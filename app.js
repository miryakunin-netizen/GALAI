import { loadState, saveState, resetState, getActiveProject, getActiveChat, createProject, createChat, renameChatFromFirstUserMessage } from './chats.js';
import { searchWeb, localReply } from './search.js';
import { initVoice } from './voice.js';

let state = loadState();
let searchMode = false;

const $ = s => document.querySelector(s);
const projectsList = $('#projects-list');
const messagesEl = $('#messages');
const msgInput = $('#msg-input');
const chatTitle = $('#chat-title');
const projectTitle = $('#project-title');
const sidebar = $('#sidebar');
const backdrop = $('#sidebar-backdrop');

function escapeHTML(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function linkify(s){
  const safe = escapeHTML(s);
  return safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function openMenu(open = true){ sidebar.classList.toggle('open', open); backdrop.classList.toggle('open', open); }
function switchTab(tab){
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#chat-screen').classList.toggle('active', tab === 'chat');
  $('#voice-screen').classList.toggle('active', tab === 'voice');
  if (innerWidth <= 768) openMenu(false);
}

function renderProjects(){
  projectsList.innerHTML = '';
  state.projects.forEach(p => {
    const box = document.createElement('div'); box.className = 'project';
    box.innerHTML = `<div class="project-head"><span class="project-dot" style="background:${p.color}"></span>${escapeHTML(p.name)}</div>`;
    p.chats.forEach(c => {
      const b = document.createElement('button'); b.className = 'chat-row' + (c.id===state.activeChatId?' active':'');
      b.innerHTML = `💬 <span>${escapeHTML(c.name)}</span>`;
      b.addEventListener('click', () => { state.activeProjectId=p.id; state.activeChatId=c.id; saveState(state); renderAll(); if(innerWidth<=768) openMenu(false); });
      box.appendChild(b);
    });
    projectsList.appendChild(box);
  });
}
function renderMessages(){
  const p = getActiveProject(state), chat = getActiveChat(state);
  projectTitle.textContent = p.name; chatTitle.textContent = chat.name;
  messagesEl.innerHTML = '';
  chat.messages.forEach(m => appendMessage(m.role, m.text, false));
  scrollBottom();
}
function appendMessage(role, text, save=true){
  const row = document.createElement('div'); row.className = 'msg ' + role;
  if (role === 'assistant') row.innerHTML = `<div class="avatar">✦</div><div class="bubble">${linkify(text)}</div>`;
  else row.innerHTML = `<div class="bubble">${linkify(text)}</div><div class="avatar">👤</div>`;
  messagesEl.appendChild(row);
  if (save) { getActiveChat(state).messages.push({role, text}); saveState(state); }
  scrollBottom();
}
function scrollBottom(){ $('#messages-wrap').scrollTop = $('#messages-wrap').scrollHeight; }
function renderAll(){ renderProjects(); renderMessages(); }
async function sendText(text){
  const clean = text.trim(); if(!clean) return;
  const chat = getActiveChat(state);
  appendMessage('user', clean);
  renameChatFromFirstUserMessage(chat, clean); saveState(state); renderProjects();
  msgInput.value=''; autoResize();
  appendMessage('assistant', 'Думаю...', false);
  const thinking = messagesEl.lastElementChild;
  try {
    const reply = searchMode ? await searchWeb(clean) : await localReply(clean);
    thinking.remove(); appendMessage('assistant', reply);
  } catch(e){ thinking.remove(); appendMessage('assistant', 'Ошибка: ' + e.message); }
}
function autoResize(){ msgInput.style.height='auto'; msgInput.style.height=Math.min(msgInput.scrollHeight, 150)+'px'; }

$('#composer').addEventListener('submit', e => { e.preventDefault(); sendText(msgInput.value); });
msgInput.addEventListener('input', autoResize);
msgInput.addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendText(msgInput.value); }});
$('#new-chat-btn').addEventListener('click', () => { createChat(state); saveState(state); renderAll(); });
$('#new-project-btn').addEventListener('click', () => { createProject(state); saveState(state); renderAll(); });
$('#reset-btn').addEventListener('click', () => { if(confirm('Удалить все локальные чаты?')) { state = resetState(); saveState(state); renderAll(); }});
$('#search-mode-btn').addEventListener('click', e => { searchMode = !searchMode; e.currentTarget.classList.toggle('active', searchMode); e.currentTarget.textContent = searchMode ? '✅ Поиск' : '🌐 Поиск'; });
$('#mobile-menu-btn').addEventListener('click', () => openMenu(!sidebar.classList.contains('open')));
backdrop.addEventListener('click', () => openMenu(false));
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
$('#voice-back-btn').addEventListener('click', () => switchTab('chat'));

initVoice({
  onUserText: text => { switchTab('chat'); sendText(text); },
  onAssistantText: () => {}
});

function initStars(){
  const canvas = $('#stars'), ctx = canvas.getContext('2d');
  const stars = Array.from({length:90},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3,a:Math.random()}));
  function resize(){ canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; }
  addEventListener('resize', resize); resize();
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='white';
    stars.forEach(s=>{ s.a += 0.02; ctx.globalAlpha = 0.2 + Math.sin(s.a)*0.25 + 0.3; ctx.beginPath(); ctx.arc(s.x*canvas.width,s.y*canvas.height,s.r*devicePixelRatio,0,Math.PI*2); ctx.fill(); });
    requestAnimationFrame(draw);
  } draw();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
renderAll(); initStars(); autoResize();
