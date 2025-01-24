export function getSystemThemePreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme() {
    // Use stored theme if available, otherwise use system preference
    const storedTheme = localStorage.getItem('dftheme');
    const theme = storedTheme || getSystemThemePreference();

    applyTheme(theme);

    // Listen for system theme changes if no stored theme
    if (!storedTheme) {
        window
            .matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (event) => {
                applyTheme(event.matches ? 'dark' : 'light');
            });
    }

    return theme;
}

export function saveThemePreference(theme) {
    localStorage.setItem('dftheme', theme);
    applyTheme(theme);
}
