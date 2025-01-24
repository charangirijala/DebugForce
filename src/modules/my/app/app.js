import { LightningElement } from 'lwc';
import { initTheme } from 'services/theme';
export default class App extends LightningElement {
    theme;
    connectedCallback() {
        this.theme = initTheme();
        window.addEventListener('scroll', this.handleScroll);
    }
    disconnectedCallback() {
        window.removeEventListener('scroll', this.handleScroll);
    }

    handleScroll = () => {
        const firstHeader = this.template.querySelector('.first-header');
        const secondHeader = this.template.querySelector('.second-header');
        const logoContainer = this.template.querySelector('.logo-container');
        const content = this.template.querySelector('.content');
        if (firstHeader && secondHeader && logoContainer && content) {
            if (window.scrollY > 0) {
                this.headerMinimized = true;
                firstHeader.classList.add('hidden');
                secondHeader.classList.add('move-to-top');
                logoContainer.style.display = 'inline-block';
            } else {
                this.headerMinimized = false;
                firstHeader.classList.remove('hidden');
                secondHeader.classList.remove('move-to-top');
                logoContainer.style.display = 'none';
            }
        }
    };
}
