export default {

    name: "search",

    async execute({ searchFunction, query }) {

        return await searchFunction(query);

    }

};
