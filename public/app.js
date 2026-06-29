import { getStatus } from "./api.js";
import { loadState, saveState } from "./storage.js";
import { ChatController } from "./chat.js";
import { ProjectController } from "./projects.js";
import { UI } from "./ui.js";
import { $ } from "./utils.js";
import { initFileUpload } from "./fileUpload.js";

const state = loadState();
const ui = new UI(state);

function save() {
  saveState(state);
}

function render() {
  ui.render();
}

const chat = new ChatController(state, render, save);
const projects = new ProjectController(state, render, save);

async function loadApiStatus() {
  try {
    const status = await getStatus();

    $("statusBadge").textContent =
      `${status.gemini ? "Gemini ✓" : "Gemini нет"} · ${status.googleSearch ? "Google ✓" : "Поиск fallback"}`;

    $("statusBadge").title = status.model || "";
  } catch (e) {
    $("statusBadge").textContent = "API недоступен";
    $("statusBadge").title = e.message;
  }
}

function bindUI() {
  chat.bindComposer();

  $("newChatBtn").onclick = () => projects.newChat();
  $("newProjectBtn").onclick = () => projects.newProject();

  $("menuBtn").onclick = () => {
    $("sidebar").classList.add("open");
    $("backdrop").classList.add("open");
  };

  $("backdrop").onclick = () => {
    $("sidebar").classList.remove("open");
    $("backdrop").classList.remove("open");
  };

  $("chatTabBtn").onclick = () => {
    $("chatView").classList.remove("hidden");
    $("voiceView").classList.add("hidden");
    $("chatTabBtn").classList.add("active");
    $("voiceTabBtn").classList.remove("active");
  };

  $("voiceTabBtn").onclick = () => {
    $("voiceView").classList.remove("hidden");
    $("chatView").classList.add("hidden");
    $("voiceTabBtn").classList.add("active");
    $("chatTabBtn").classList.remove("active");
  };
}

function init() {
  bindUI();
  initFileUpload();
  render();
  loadApiStatus();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
