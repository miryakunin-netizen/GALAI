import { uid } from "./utils.js";

export class ProjectController {
  constructor(state, render, save) {
    this.state = state;
    this.render = render;
    this.save = save;
  }

  currentProject() {
    return this.state.projects.find(
      p => p.id === this.state.activeProjectId
    );
  }

  newChat() {
    const project = this.currentProject();

    const chat = {
      id: uid("c"),
      title: "Новый чат",
      messages: [
        {
          role: "assistant",
          text: "Новый чат создан. Чем помочь?"
        }
      ]
    };

    project.chats.unshift(chat);
    this.state.activeChatId = chat.id;

    this.save();
    this.render();
  }

  newProject() {
    const name = prompt("Название проекта:", "Новый проект");

    if (!name) return;

    const project = {
      id: uid("p"),
      name,
      chats: [
        {
          id: uid("c"),
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

    this.state.projects.unshift(project);
    this.state.activeProjectId = project.id;
    this.state.activeChatId = project.chats[0].id;

    this.save();
    this.render();
  }
}
