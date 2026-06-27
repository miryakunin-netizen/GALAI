export function $(id) {
    return document.getElementById(id);
}

export function uid(prefix = "") {
    return prefix + Math.random().toString(36).slice(2, 9);
}

export function escapeHtml(text = "") {
    return String(text).replace(/[&<>"]/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    })[c]);
}

export function linkify(text = "") {
    return escapeHtml(text).replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );
}

export function autoGrow(textarea) {
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height =
        Math.min(textarea.scrollHeight, 160) + "px";
}

export function scrollToBottom(container) {
    if (!container) return;

    container.scrollTop = container.scrollHeight;
}
