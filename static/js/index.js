window.HELP_IMPROVE_VIDEOJS = false;

const APP_CONFIG = {
    debugMode: true,
    defaultLanguage: 'en',
    storageKey: 'dashengAudioGenAnnotations.v2',
    selectionManifestPath: './data/selected_cases.json'
};

const CATEGORIES = ['mix', 'speech', 'music', 'sound'];
const TOKEN_CLASSES = {
    '<|caption|>': 'token-caption',
    '<|speech|>': 'token-speech',
    '<|asr|>': 'token-asr',
    '<|music|>': 'token-music',
    '<|sfx|>': 'token-sfx',
    '<|env|>': 'token-env'
};

const APP_STATE = {
    debugMode: false,
    items: [],
    activeCategory: 'mix',
    langByCategory: {
        mix: APP_CONFIG.defaultLanguage,
        speech: APP_CONFIG.defaultLanguage,
        music: APP_CONFIG.defaultLanguage,
        sound: APP_CONFIG.defaultLanguage
    },
    annotations: {}
};

const MODULE_META = {
    mix: { title: 'Mix Audio' },
    speech: { title: 'Clean Speech' },
    music: { title: 'Music' },
    sound: { title: 'Sound Effect' }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', function () {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (!scrollButton) return;
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

function resolveDebugMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) {
        return params.get('debug') === '1';
    }
    return APP_CONFIG.debugMode;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function highlightStructuredCaption(text) {
    const pattern = /(<\|caption\|>|<\|speech\|>|<\|asr\|>|<\|music\|>|<\|sfx\|>|<\|env\|>)/g;
    const parts = String(text || '').split(pattern);
    return parts.map(part => {
        if (TOKEN_CLASSES[part]) {
            return `<span class="caption-token ${TOKEN_CLASSES[part]}">${escapeHtml(part)}</span>`;
        }
        return escapeHtml(part);
    }).join('');
}

function emptyAnnotationBucket() {
    return { selectedIds: [], orderedIds: [] };
}

function hasAnySelection(annotations) {
    return CATEGORIES.some(category => {
        const bucket = annotations && annotations[category];
        if (!bucket) return false;
        return (bucket.selectedIds || []).length > 0 || (bucket.orderedIds || []).length > 0;
    });
}

function normalizeManifest(raw) {
    const normalized = {};

    CATEGORIES.forEach(category => {
        const source = raw && raw[category] ? raw[category] : {};
        const selectedIds = Array.isArray(source.selectedIds) ? source.selectedIds : [];
        const orderedIds = Array.isArray(source.orderedIds) ? source.orderedIds : [];

        normalized[category] = {
            selectedIds: [...new Set(selectedIds.map(String))],
            orderedIds: [...new Set(orderedIds.map(String))]
        };
    });

    return normalized;
}

async function loadSelectionManifest() {
    try {
        const response = await fetch(APP_CONFIG.selectionManifestPath, { cache: 'no-cache' });
        if (!response.ok) {
            if (response.status === 404) {
                return {};
            }
            throw new Error(`Cannot load selection manifest: ${response.status}`);
        }

        const data = await response.json();
        return normalizeManifest(data);
    } catch (error) {
        console.warn('Selection manifest not loaded:', error);
        return {};
    }
}

function getStorage() {
    try {
        const raw = localStorage.getItem(APP_CONFIG.storageKey);
        return raw ? JSON.parse(raw) : {};
    } catch (_error) {
        return {};
    }
}

function saveStorage() {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(APP_STATE.annotations));
}

function ensureBucket(category) {
    if (!APP_STATE.annotations[category]) {
        APP_STATE.annotations[category] = emptyAnnotationBucket();
    }
    return APP_STATE.annotations[category];
}

function getCandidates(category) {
    return APP_STATE.items.filter(item => item.category === category);
}

function normalizeOrder(category, candidates) {
    const bucket = ensureBucket(category);
    const candidateIds = candidates.map(item => item.audio_id);
    const candidateSet = new Set(candidateIds);

    bucket.selectedIds = bucket.selectedIds.filter(id => candidateSet.has(id));
    bucket.orderedIds = bucket.orderedIds.filter(id => candidateSet.has(id));

    candidateIds.forEach(id => {
        if (!bucket.orderedIds.includes(id)) {
            bucket.orderedIds.push(id);
        }
    });
}

function getVisibleItems(category) {
    const candidates = getCandidates(category);
    normalizeOrder(category, candidates);

    const bucket = ensureBucket(category);
    const map = new Map(candidates.map(item => [item.audio_id, item]));

    if (APP_STATE.debugMode) {
        return bucket.orderedIds.map(id => map.get(id)).filter(Boolean);
    }

    const selected = new Set(bucket.selectedIds);
    return bucket.orderedIds
        .filter(id => selected.has(id))
        .map(id => map.get(id))
        .filter(Boolean);
}

function updateModeBanner() {
    const banner = document.getElementById('mode-banner');
    if (!banner) return;
    document.body.classList.toggle('debug-mode', APP_STATE.debugMode);
    document.body.classList.toggle('display-mode', !APP_STATE.debugMode);
    banner.classList.remove('is-hidden');
    banner.textContent = APP_STATE.debugMode
        ? 'Debug mode enabled: checkbox + drag sorting are active. Final page shows checked items only.'
        : 'Display mode enabled: only selected items from debug mode are shown.';

    const tools = document.getElementById('selection-tools');
    if (tools) {
        tools.classList.toggle('is-hidden', !APP_STATE.debugMode);
    }
}

function exportSelectionManifest() {
    const payload = {};

    CATEGORIES.forEach(category => {
        const candidates = getCandidates(category);
        normalizeOrder(category, candidates);

        const bucket = ensureBucket(category);
        const validIdSet = new Set(candidates.map(item => item.audio_id));
        const selectedIds = bucket.selectedIds.filter(id => validIdSet.has(id));
        const orderedIds = bucket.orderedIds.filter(id => validIdSet.has(id));

        payload[category] = {
            selectedIds,
            orderedIds
        };
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'selected_cases.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function resetLocalSelection() {
    localStorage.removeItem(APP_CONFIG.storageKey);
    APP_STATE.annotations = {};
    renderAll();
}

function bindSelectionTools() {
    const exportBtn = document.getElementById('export-selection-btn');
    const resetBtn = document.getElementById('reset-selection-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportSelectionManifest);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetLocalSelection);
    }
}

function createAudioRow(item, category, lang) {
    const bucket = ensureBucket(category);
    const selected = bucket.selectedIds.includes(item.audio_id);
    const shortCaption = lang === 'zh'
        ? (item.caption_short_zh || item.caption_short)
        : item.caption_short;

    const row = document.createElement('article');
    row.className = `audio-row box ${selected ? 'is-selected' : ''}`;
    row.dataset.audioId = item.audio_id;
    row.dataset.category = category;
    row.dataset.lang = lang;

    if (APP_STATE.debugMode) {
        row.draggable = true;
    }

    const checkboxCol = APP_STATE.debugMode
        ? `<div class="cell cell-check"><input type="checkbox" class="audio-check" data-audio-id="${escapeHtml(item.audio_id)}" ${selected ? 'checked' : ''}></div>`
        : '';

    row.innerHTML = `
        ${checkboxCol}
        <div class="cell cell-short">
            <div class="caption-hint">short caption</div>
            <div class="short-caption">${escapeHtml(shortCaption)}</div>
        </div>
        <div class="cell cell-structured">
            <div class="caption-hint">refined structured caption</div>
            <div class="structured-caption-text">${highlightStructuredCaption(item.caption)}</div>
        </div>
        <div class="cell cell-audio">
            <audio controls preload="metadata" src="./generated_wavs/${encodeURIComponent(item.audio_id)}.wav"></audio>
        </div>
    `;

    return row;
}

function syncLanguageButtons() {
    const lang = APP_STATE.langByCategory[APP_STATE.activeCategory] || APP_CONFIG.defaultLanguage;
    document.querySelectorAll('.lang-switch button').forEach(btn => {
        const selected = btn.dataset.lang === lang;
        btn.classList.toggle('is-link', selected);
        btn.classList.toggle('is-selected', selected);
    });
}

function syncActiveModuleHeader() {
    const titleNode = document.getElementById('active-module-title');
    if (titleNode) {
        titleNode.textContent = MODULE_META[APP_STATE.activeCategory].title;
    }

    document.querySelectorAll('.module-tab-btn').forEach(btn => {
        const active = btn.dataset.category === APP_STATE.activeCategory;
        btn.classList.toggle('is-active', active);
        const li = btn.closest('li');
        if (li) {
            li.classList.toggle('is-active', active);
        }
    });
}

function renderActiveModule() {
    const category = APP_STATE.activeCategory;
    const lang = APP_STATE.langByCategory[category] || APP_CONFIG.defaultLanguage;
    const list = document.getElementById('list-active');
    if (!list) return;

    const visible = getVisibleItems(category);
    list.innerHTML = '';

    if (visible.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'empty-hint notification is-light';
        hint.textContent = APP_STATE.debugMode
            ? 'No items available for this language/category.'
            : 'No selected items. Enable debug mode to select examples.';
        list.appendChild(hint);
        return;
    }

    visible.forEach(item => {
        list.appendChild(createAudioRow(item, category, lang));
    });
}

function renderAll() {
    syncActiveModuleHeader();
    syncLanguageButtons();
    renderActiveModule();
}

function bindLanguageSwitch() {
    document.querySelectorAll('.lang-switch button').forEach(button => {
        button.addEventListener('click', function () {
            const lang = this.dataset.lang;
            const category = APP_STATE.activeCategory;
            APP_STATE.langByCategory[category] = lang;

            syncLanguageButtons();
            renderActiveModule();
        });
    });
}

function bindModuleTabs() {
    document.querySelectorAll('.module-tab-btn').forEach(button => {
        button.addEventListener('click', function () {
            APP_STATE.activeCategory = this.dataset.category;
            renderAll();
        });
    });
}

function moveIdBefore(order, draggedId, targetId) {
    const next = order.filter(id => id !== draggedId);
    const targetIndex = next.indexOf(targetId);
    if (targetIndex < 0) {
        next.push(draggedId);
        return next;
    }
    next.splice(targetIndex, 0, draggedId);
    return next;
}

function bindListInteractions() {
    const list = document.getElementById('list-active');
    if (!list) return;

    list.addEventListener('change', function (event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.classList.contains('audio-check')) return;

        const row = target.closest('.audio-row');
        if (!row) return;

        const category = row.dataset.category;
        const audioId = target.dataset.audioId;
        const bucket = ensureBucket(category);

        if (target.checked) {
            if (!bucket.selectedIds.includes(audioId)) {
                bucket.selectedIds.push(audioId);
            }
            row.classList.add('is-selected');
        } else {
            bucket.selectedIds = bucket.selectedIds.filter(id => id !== audioId);
            row.classList.remove('is-selected');
        }

        saveStorage();
    });

    if (!APP_STATE.debugMode) return;

    let draggedId = null;

    list.addEventListener('dragstart', function (event) {
        const row = event.target.closest('.audio-row');
        if (!row) return;
        draggedId = row.dataset.audioId;
        row.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
    });

    list.addEventListener('dragend', function (event) {
        const row = event.target.closest('.audio-row');
        if (row) {
            row.classList.remove('is-dragging');
        }
        list.querySelectorAll('.audio-row').forEach(node => node.classList.remove('drag-over'));
    });

    list.addEventListener('dragover', function (event) {
        event.preventDefault();
        const row = event.target.closest('.audio-row');
        if (!row || row.dataset.audioId === draggedId) return;
        list.querySelectorAll('.audio-row').forEach(node => node.classList.remove('drag-over'));
        row.classList.add('drag-over');
    });

    list.addEventListener('drop', function (event) {
        event.preventDefault();
        const targetRow = event.target.closest('.audio-row');
        if (!targetRow || !draggedId) return;

        const targetId = targetRow.dataset.audioId;
        const category = targetRow.dataset.category;
        const bucket = ensureBucket(category);
        bucket.orderedIds = moveIdBefore(bucket.orderedIds, draggedId, targetId);

        saveStorage();
        renderActiveModule();
        draggedId = null;
    });
}

function parseJsonl(content) {
    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line));
}

async function loadAudioData() {
    try {
        const response = await fetch('./audio_captions.jsonl');
        if (!response.ok) {
            throw new Error(`Cannot load audio_captions.jsonl: ${response.status}`);
        }
        const text = await response.text();
        return parseJsonl(text);
    } catch (error) {
        if (typeof window.AUDIO_CAPTIONS_JSONL === 'string' && window.AUDIO_CAPTIONS_JSONL.trim()) {
            return parseJsonl(window.AUDIO_CAPTIONS_JSONL);
        }

        if (window.location.protocol === 'file:') {
            throw new Error('Failed to fetch audio metadata in file mode. Please use a local HTTP server or keep fallback data file available.');
        }

        throw error;
    }
}

function showError(error) {
    const errorNode = document.getElementById('error-state');
    const loadingNode = document.getElementById('loading-state');
    if (loadingNode) loadingNode.classList.add('is-hidden');
    if (errorNode) {
        errorNode.classList.remove('is-hidden');
        errorNode.textContent = String(error.message || error);
    }
}

function hideLoading() {
    const loadingNode = document.getElementById('loading-state');
    if (loadingNode) {
        loadingNode.classList.add('is-hidden');
    }
}

async function bootstrap() {
    localStorage.removeItem('dashengAudioGenAnnotations.v1');

    APP_STATE.debugMode = resolveDebugMode();
    const localAnnotations = getStorage();

    bindLanguageSwitch();
    bindModuleTabs();
    updateModeBanner();
    bindSelectionTools();

    try {
        APP_STATE.items = await loadAudioData();

        const manifestAnnotations = await loadSelectionManifest();
        const hasLocal = hasAnySelection(localAnnotations);
        const hasManifest = hasAnySelection(manifestAnnotations);

        if (APP_STATE.debugMode) {
            APP_STATE.annotations = hasLocal ? localAnnotations : manifestAnnotations;
        } else {
            APP_STATE.annotations = hasManifest ? manifestAnnotations : localAnnotations;
        }

        hideLoading();
        renderAll();
        bindListInteractions();
        saveStorage();
    } catch (error) {
        showError(error);
    }
}

$(document).ready(function () {
    bootstrap();
});
