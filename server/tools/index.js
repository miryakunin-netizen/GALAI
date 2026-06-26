export const ToolRegistry = {

    tools: {},

    register(name, tool) {
        this.tools[name] = tool;
    },

    has(name) {
        return !!this.tools[name];
    },

    get(name) {
        return this.tools[name];
    },

    list() {
        return Object.keys(this.tools);
    }
};
