// CodeBlocks Shared Utilities

const Utils = {
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    displayName(savedBlock) {
        const d = savedBlock.data;
        return d?.name || d?.customType || d?.module || savedBlock.type;
    },

    truncate(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }
};

const Storage = {
    get(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`Storage.set("${key}") failed:`, e);
        }
    }
};

const Clipboard = {
    copy(text, btnEl, successText = 'Copied!', duration = 1500) {
        navigator.clipboard.writeText(text).then(() => {
            const original = btnEl.textContent;
            btnEl.textContent = successText;
            setTimeout(() => btnEl.textContent = original, duration);
        });
    }
};

const CANVAS_HINT_HTML = `
    <div class="canvas-hint">
        Click buttons to add blocks<br>
        <small>Drag Function/Variable blocks into Class blocks<br>
        Drag Variable blocks into Function blocks</small>
    </div>
`;
