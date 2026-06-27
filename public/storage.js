const STORAGE_KEY = "galai_4_state_v1";

export function loadState() {
    try {
        const state = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (state) {
            return state;
        }
    } catch (e) {
        console.warn("Storage damaged", e);
    }

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
                                text: "Привет! Я GALAI 5.0."
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

export function saveState(state) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );
}
