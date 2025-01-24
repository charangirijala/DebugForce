import { LightningElement, api } from 'lwc';
import { applyTheme, saveThemePreference } from 'services/theme';

export default class AppHeader extends LightningElement {
    @api theme;
    isDark = false;
    connectedCallback() {
        this.isDark = this.theme === 'dark' ? true : false;
    }
    toggleMode() {
        this.isDark = !this.isDark;
        const theme = this.isDark ? 'dark' : 'light';
        console.log('theme: ', theme);
        applyTheme(theme);
        saveThemePreference(theme);
    }
}
