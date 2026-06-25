const STORAGE_KEY = 'galai_v2_state';
const COLORS = ['#A78BFA','#60A5FA','#34D399','#F472B6','#FBBF24','#38BDF8','#C084FC','#4ADE80'];

function defaults(){
  return {
    activeProjectId: 1,
    activeChatId: 101,
    nextId: 300,
    projects: [
      { id:1, name:'Личное', color:'#A78BFA', chats:[{ id:101, name:'Планирование', messages:[{ role:'assistant', text:'Привет! Я GALAI. Чем могу помочь?' }] }] },
      { id:2, name:'Работа', color:'#60A5FA', chats:[{ id:201, name:'Анализ данных', messages:[{ role:'assistant', text:'Готов помогать с задачами, кодом, поиском и идеями.' }] }] }
    ]
  };
}

export function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const state = JSON.parse(raw);
    if (!state.projects || !Array.isArray(state.projects) || !state.projects.length) return defaults();
    return state;
  } catch { return defaults(); }
}
export function saveState(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function resetState(){ localStorage.removeItem(STORAGE_KEY); return defaults(); }
export function getActiveProject(state){ return state.projects.find(p=>p.id===state.activeProjectId) || state.projects[0]; }
export function getActiveChat(state){ return state.projects.flatMap(p=>p.chats).find(c=>c.id===state.activeChatId) || getActiveProject(state).chats[0]; }
export function createProject(state){
  const name = prompt('Название проекта:', 'Новый проект');
  if (!name) return;
  const id = state.nextId++;
  const chatId = state.nextId++;
  state.projects.push({ id, name: name.trim(), color: COLORS[state.projects.length % COLORS.length], chats:[{ id: chatId, name:'Новый чат', messages:[{role:'assistant', text:'Новый проект создан.'}] }] });
  state.activeProjectId = id; state.activeChatId = chatId;
}
export function createChat(state){
  const p = getActiveProject(state);
  const id = state.nextId++;
  p.chats.push({ id, name:'Новый чат', messages:[{role:'assistant', text:'Новый чат готов.'}] });
  state.activeChatId = id;
}
export function renameChatFromFirstUserMessage(chat, text){
  if (chat.name === 'Новый чат' && text.trim()) chat.name = text.trim().slice(0, 28);
}
