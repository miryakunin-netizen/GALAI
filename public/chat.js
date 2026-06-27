import { sendChatMessage } from "./api.js";
import { autoGrow } from "./utils.js";

export class ChatController {

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

    currentChat() {
        const p = this.currentProject();

        return p.chats.find(
            c => c.id === this.state.activeChatId
        );
    }

    async send(text) {

        const chat = this.currentChat();

        chat.messages.push({
            role: "user",
            text
        });

        if (
            chat.title === "Первый чат" ||
            chat.title === "Новый чат"
        ) {
            chat.title = text.slice(0, 30);
        }

        const thinking = {
            role: "assistant",
            text: "Думаю..."
        };

        chat.messages.push(thinking);

        this.save();
        this.render();

        try {

            const response =
                await sendChatMessage({

                    message: text,

                    history: chat.messages.slice(0, -1)

                });

            thinking.text =
                response.answer ||
                "Нет ответа";

        } catch (e) {

            thinking.text =
                "Ошибка: " + e.message;

        }

        this.save();
        this.render();

    }

    bindComposer() {

        const form =
            document.getElementById("chatForm");

        const input =
            document.getElementById("messageInput");

        form.onsubmit = async e => {

            e.preventDefault();

            const text =
                input.value.trim();

            if (!text) return;

            input.value = "";

            autoGrow(input);

            await this.send(text);

        };

        input.oninput =
            () => autoGrow(input);

        input.onkeydown = e => {

            if (
                e.key === "Enter" &&
                !e.shiftKey
            ) {

                e.preventDefault();

                form.requestSubmit();

            }

        };

    }

}
