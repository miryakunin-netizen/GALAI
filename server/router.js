import { buildBrainContext } from "./brain.js";

export function routeRequest({
  message,
  history = [],
  searchResults = []
}) {

  const context = buildBrainContext({
    message,
    history,
    sources: searchResults
  });

  return {
    context,

    useSearch: context.useSearch,

    systemInstruction: context.systemInstruction,

    history: context.history
  };
}
