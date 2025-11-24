// State management
export const state = {
    chatMode: false,
    configOpen: false,
    history: [],
    historyIndex: -1,
    path: ['home'],
    currentMode: 'sh', // 'sh' or 'agent'

    // Confirmation Handling
    waitingForConfirmation: false,
    confirmationResolver: null,

    // Directory Tracking
    dirHistory: JSON.parse(localStorage.getItem('minai_dir_history') || '{}'),
    suggestions: [],
    suggestionIndex: 0,

    // API Configuration (Load once on start)
    apiKey: localStorage.getItem('openai_api_key') || '',
    baseUrl: localStorage.getItem('openai_base_url') || 'https://aipipe.org/openrouter/v1/chat/completions',
    isLoading: false
};

// Directory tracking - like zoxide
export function trackDirectory(path) {
    const now = Date.now();
    if (!state.dirHistory[path]) {
        state.dirHistory[path] = { count: 0, lastVisit: now };
    }
    state.dirHistory[path].count++;
    state.dirHistory[path].lastVisit = now;
    localStorage.setItem('minai_dir_history', JSON.stringify(state.dirHistory));
}

export function getDirectorySuggestions(partial) {
    const now = Date.now();
    const scores = Object.entries(state.dirHistory).map(([path, data]) => {
        const ageHours = (now - data.lastVisit) / (1000 * 60 * 60);
        const recencyMultiplier = Math.max(0.25, 1 / (1 + ageHours / 24));
        const frecency = data.count * recencyMultiplier;
        return { path, frecency };
    });

    return scores
        .filter(s => !partial || s.path.includes(partial))
        .sort((a, b) => b.frecency - a.frecency)
        .slice(0, 5)
        .map(s => s.path);
}
