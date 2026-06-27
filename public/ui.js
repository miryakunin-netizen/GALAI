import { $, linkify } from "./utils.js";

export class UI {

    constructor(state) {
        this.state = state;
    }

    project() {
        return this.state.projects.find(
            p => p.id === this.state.activeProjectId
        );
    }

    chat() {
        const p = this.project();

        return p.chats.find(
            c => c.id === this.state.activeChatId
        );
    }

    renderProjects() {

        const box = $("projects");

        box.innerHTML = "";

        this.state.projects.forEach(project => {

            const wrap =
                document.createElement("div");

            wrap.className = "project";

            const head =
                document.createElement("button");

            head.className = "project-head";

            head.innerHTML =
                `<span>${project.name}</span><span>▾</span>`;

            head.onclick = () => {

                this.state.activeProjectId =
                    project.id;

                this.state.activeChatId =
                    project.chats[0].id;

                this.render();

            };

            wrap.appendChild(head);

            project.chats.forEach(chat => {

                const b =
                    document.createElement("button");

                b.className =
                    "chat-item" +
                    (
                        chat.id ===
                        this.state.activeChatId
                            ? " active"
                            : ""
                    );

                b.textContent = chat.title;

                b.onclick = () => {

                    this.state.activeProjectId =
                        project.id;

                    this.state.activeChatId =
                        chat.id;

                    this.render();

                };

                wrap.appendChild(b);

            });

            box.appendChild(wrap);

        });

    }

    renderMessages() {

        const chat = this.chat();

        $("activeProject").textContent =
            this.project().name;

        $("activeChatTitle").textContent =
            chat.title;

        const box =
            $("messages");

        box.innerHTML = "";

        chat.messages.forEach(message => {

            const row =
                document.createElement("div");

            row.className =
                "msg " + message.role;

            if (message.role !== "user") {

                const avatar =
                    document.createElement("div");

                avatar.className = "avatar";

                avatar.textContent = "✦";

                row.appendChild(avatar);

            }

            const bubble =
                document.createElement("div");

            bubble.className = "bubble";

            bubble.innerHTML =
                linkify(message.text);

            row.appendChild(bubble);

            box.appendChild(row);

        });

        box.scrollTop =
            box.scrollHeight;

    }

    render() {

        this.renderProjects();

        this.renderMessages();

    }

}
