export default {

    name: "file",

    async execute({ reader, path, mimeType }) {

        return await reader(path, mimeType);

    }

};
