import { LightningElement } from 'lwc';
import { initTheme } from 'services/theme';

export default class App extends LightningElement {
    connectedCallback() {
        initTheme();
        // window.addEventListener('scroll', this.handleScroll);
    }

    disconnectedCallback() {
        // window.removeEventListener('scroll', this.handleScroll);
    }

    handleScroll = () => {
        const firstHeader = this.template.querySelector('.first-header');
        const secondHeader = this.template.querySelector('.second-header');

        const firstHeaderLogo =
            this.template.querySelector('#first-header-logo');
        const secondHeaderLogoContainer = this.template.querySelector(
            '#second-header-logo'
        );
        console.log(
            'headers: ',
            firstHeader,
            '2nd: ',
            secondHeader,
            '1st logo: ',
            firstHeaderLogo,
            ' 2nd logo: ',
            secondHeaderLogoContainer
        );
        if (firstHeader && secondHeader) {
            console.log('scroll: ', window.scrollY);
            if (window.scrollY > 0) {
                // Hide the first header
                firstHeader.classList.add('hidden');

                // Move the second header to the top
                secondHeader.classList.add('move-to-top');

                // // Move the logo to the second header
                // if (!secondHeaderLogoContainer.querySelector('.logo')) {
                //     const clonedLogo = firstHeaderLogo.cloneNode(true);
                //     clonedLogo.classList.add('move-to-second-header'); // Add animation class
                //     secondHeaderLogoContainer.appendChild(clonedLogo);
                //}
            } else {
                // Show the first header
                firstHeader.classList.remove('hidden');

                // Move the second header back to its default position
                secondHeader.classList.remove('move-to-top');

                // Remove the logo from the second header
                // if (secondHeaderLogoContainer.querySelector('.logo')) {
                //     secondHeaderLogoContainer.innerHTML = '';
                // }
            }
        }
    };
}
