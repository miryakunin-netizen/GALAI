const $ = (id) => document.getElementById(id);
const STORAGE = "galai_3_state_v1";

const GalaiCore = {
  shouldUseSearch(message) {
    const text = String(message || "").toLowerCase();
    const triggers = [
      "сегодня",
      "сейчас",
      "новости",
      "актуаль",
      "последн",
      "что такое",
      "кто такой",
      "кто такая",
      "найди",
      "поищи",
      "цена",
      "курс",
      "погода",
      "2025",
      "2026"
    ];

    return triggers.some((word) => text.includes(word));
  },

  buildPayload({ message, history = [] }) {
    return {
      message,
      history,
      useSearch: this.shouldUseSearch(message)
    };
  },

  async ask({ message, history = [] }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(this.buildPayload({ message, history }))
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Ошибка GALAI Core");
    }

    return data;
  }
};

let backendStatus = {
  gemini: false,
  googleSearch: false,
  model: null
};

let state = loadState();
let activeProjectId = state.activeProjectId;
let activeChatId = state.activeChatId;
let listening = false;
let recognition = null;

function defaultState() {
  const now = Date.now();

  return {
    activeProjectId: "p1",
    activeChatId: "c1",
    projects: [
      {
        id: "p1",
        name: "Личное",
        chats: [
          {
            id: "c1",
            title: "Первый чат",
            messages: [
              {
                role: "assistant",
                text: "Привет! Я GALAI 4.0. Я дружелюбный помощник, могу искать в интернете, помнить контекст текущего диалога и мягко спорить, если вижу ошибку. Чем помочь?"
              }
            ]
          }
        ]
      }
    ],
    createdAt: now
  };
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE)) || defaultState();
  } catch {
    return defaultState();
  }
}

function save() {
  state.activeProjectId = activeProjectId;
  state.activeChatId = activeChatId;
  localStorage.setItem(STORAGE, JSON.stringify(state));
}

function project() {
  return state.projects.find((p) => p.id === activeProjectId) || state.projects[0];
}

function chat() {
  const p = project();
  return p?.chats.find((c) => c.id === activeChatId) || p?.chats[0];
}

function id(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function renderProjects() {
  const box = $("projects");
  if (!box) return;

  box.innerHTML = "";

  state.projects.forEach((p) => {
    const wrap = document.createElement("div");
    wrap.className = "project";

    const head = document.createElement("button");
    head.className = "project-head";
    head.innerHTML = `<span>${escapeHtml(p.name)}</span><span>▾</span>`;
    head.onclick = () => {
      activeProjectId = p.id;
      activeChatId = p.chats[0]?.id;
      closeMenu();
      save();
      render();
    };

    wrap.appendChild(head);

    p.chats.forEach((c) => {
      const b = document.createElement("button");
      b.className = "chat-item" + (c.id === activeChatId ? " active" : "");
      b.textContent = c.title;
      b.onclick = () => {
        activeProjectId = p.id;
        activeChatId = c.id;
        closeMenu();
        save();
        render();
      };

      wrap.appendChild(b);
    });

    box.appendChild(wrap);
  });
}

function renderMessages() {
  const c = chat();

  const activeProject = $("activeProject");
  const activeChatTitle = $("activeChatTitle");
  const box = $("messages");

  if (activeProject) activeProject.textContent = project()?.name || "Проект";
  if (activeChatTitle) activeChatTitle.textContent = c?.title || "GALAI";
  if (!box) return;

  box.innerHTML = "";
  (c?.messages || []).forEach((m) => addMessageToDom(m.role, m.text));

  box.scrollTop = box.scrollHeight;
}

function addMessageToDom(role, text) {
  const row = document.createElement("div");
  row.className = "msg " + role;

  if (role !== "user") {
    const av = document.createElement("div");
    av.className = "avatar";
    av.textContent = "✦";
    row.appendChild(av);
  }

  const b = document.createElement("div");
  b.className = "bubble";
  b.innerHTML = linkify(escapeHtml(text));

  if (role === "assistant" && text && text !== "Думаю...") {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "📋 Копировать";
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "✅ Скопировано";
        setTimeout(() => (copyBtn.textContent = "📋 Копировать"), 1500);
      } catch {
        copyBtn.textContent = "Не удалось";
        setTimeout(() => (copyBtn.textContent = "📋 Копировать"), 1500);
      }
    };

    actions.appendChild(copyBtn);
    b.appendChild(actions);
  }

  row.appendChild(b);
  $("messages").appendChild(row);
}

function render() {
  renderProjects();
  renderMessages();
}

async function loadStatus() {
  try {
    const r = await fetch("/api/status");
    backendStatus = await r.json();

    const el = $("statusBadge");
    if (el) {
      const g = backendStatus.gemini ? "Gemini ✓" : "Gemini нет";
      const s = backendStatus.googleSearch ? "Google ✓" : "Поиск fallback";
      el.textContent = `${g} · ${s}`;
      el.title = backendStatus.model ? `Модель: ${backendStatus.model}` : "";
    }
  } catch {
    const el = $("statusBadge");
    if (el) el.textContent = "API недоступен";
  }
}

async function sendMessage(text) {
  const c = chat();
  if (!c) return;

  c.messages.push({
    role: "user",
    text
  });

  if ((c.title === "Первый чат" || c.title === "Новый чат") && text.length) {
    c.title = text.slice(0, 28);
  }

  const thinking = {
    role: "assistant",
    text: "Думаю..."
  };

  c.messages.push(thinking);
  save();
  render();

  try {
    const data = await GalaiCore.ask({
      message: text,
      history: c.messages.slice(0, -1)
    });

    thinking.text = data.answer || data.error || "Ошибка ответа";
  } catch (e) {
    thinking.text = "Ошибка соединения с сервером: " + e.message;
  }

  save();
  renderMessages();
}

function setupChatForm() {
  const form = $("chatForm");
  const input = $("messageInput");

  if (!form || !input) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    autoGrow(input);
    sendMessage(text);
  });

  input.addEventListener("input", (e) => autoGrow(e.target));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

function setupButtons() {
  const newChatBtn = $("newChatBtn");
  const newProjectBtn = $("newProjectBtn");
  const menuBtn = $("menuBtn");
  const backdrop = $("backdrop");
  const chatTabBtn = $("chatTabBtn");
  const voiceTabBtn = $("voiceTabBtn");

  if (newChatBtn) {
    newChatBtn.onclick = () => {
      const p = project();
      const c = {
        id: id("c"),
        title: "Новый чат",
        messages: [
          {
            role: "assistant",
            text: "Новый чат создан. Чем помочь?"
          }
        ]
      };

      p.chats.unshift(c);
      activeChatId = c.id;
      save();
      render();
    };
  }

  if (newProjectBtn) {
    newProjectBtn.onclick = () => {
      const name = prompt("Название проекта:", "Новый проект");
      if (!name) return;

      const p = {
        id: id("p"),
        name,
        chats: [
          {
            id: id("c"),
            title: "Первый чат",
            messages: [
              {
                role: "assistant",
                text: "Проект создан. Задай вопрос."
              }
            ]
          }
        ]
      };

      state.projects.unshift(p);
      activeProjectId = p.id;
      activeChatId = p.chats[0].id;
      save();
      render();
    };
  }

  if (menuBtn) menuBtn.onclick = openMenu;
  if (backdrop) backdrop.onclick = closeMenu;

  if (chatTabBtn) chatTabBtn.onclick = () => switchView("chat");
  if (voiceTabBtn) voiceTabBtn.onclick = () => switchView("voice");
}

function openMenu() {
  const sidebar = $("sidebar");
  const backdrop = $("backdrop");

  if (sidebar) sidebar.classList.add("open");
  if (backdrop) backdrop.classList.add("open");
}

function closeMenu() {
  const sidebar = $("sidebar");
  const backdrop = $("backdrop");

  if (sidebar) sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
}

function switchView(name) {
  const chatView = $("chatView");
  const voiceView = $("voiceView");
  const chatTabBtn = $("chatTabBtn");
  const voiceTabBtn = $("voiceTabBtn");

  if (chatView) chatView.classList.toggle("hidden", name !== "chat");
  if (voiceView) voiceView.classList.toggle("hidden", name !== "voice");
  if (chatTabBtn) chatTabBtn.classList.toggle("active", name === "chat");
  if (voiceTabBtn) voiceTabBtn.classList.toggle("active", name === "voice");
}

function setupVoice() {
  const voiceStatus = $("voiceStatus");
  const voiceOrb = $("voiceOrb");
  const voiceTranscript = $("voiceTranscript");

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    if (voiceStatus) voiceStatus.textContent = "Голосовой ввод недоступен. Используй поле ниже.";
    return;
  }

  recognition = new SR();
  recognition.lang = "ru-RU";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    listening = true;
    if (voiceOrb) voiceOrb.classList.add("listening");
    if (voiceStatus) voiceStatus.textContent = "Слушаю...";
  };

  recognition.onend = () => {
    listening = false;
    if (voiceOrb) voiceOrb.classList.remove("listening");
    if (voiceStatus) voiceStatus.textContent = "Нажми на микрофон";
  };

  recognition.onerror = (e) => {
    if (voiceStatus) voiceStatus.textContent = "Ошибка голоса: " + (e.error || "unknown");
  };

  recognition.onresult = (e) => {
    let text = "";

    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
    }

    if (voiceTranscript) voiceTranscript.textContent = text;

    if (e.results[e.results.length - 1].isFinal && text.trim()) {
      switchView("chat");
      sendMessage(text.trim());
    }
  };

  if (voiceOrb) {
    voiceOrb.onclick = () => {
      if (!recognition) return;

      try {
        listening ? recognition.stop() : recognition.start();
      } catch {
        if (voiceStatus) voiceStatus.textContent = "Не удалось запустить голос. Открой в Safari/Chrome.";
      }
    };
  }

  const fallbackForm = $("voiceFallbackForm");
  const fallbackInput = $("voiceFallbackInput");

  if (fallbackForm && fallbackInput) {
    fallbackForm.onsubmit = (e) => {
      e.preventDefault();

      const v = fallbackInput.value.trim();
      if (!v) return;

      fallbackInput.value = "";
      switchView("chat");
      sendMessage(v);
    };
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function linkify(s) {
  return s.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

registerServiceWorker();
setupChatForm();
setupButtons();
loadStatus();
setupVoice();
render();
