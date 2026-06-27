export class Memory {

    constructor() {
        this.store = new Map();
    }

    get(userId) {
        return this.store.get(userId) || [];
    }

    save(userId, role, text) {

        const history = this.get(userId);

        history.push({
            role,
            text,
            time: Date.now()
        });

        if (history.length > 100) {
            history.shift();
        }

        this.store.set(userId, history);
    }

}

export const memory = new Memory();
