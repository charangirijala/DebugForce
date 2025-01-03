import { LightningElement } from 'lwc';
import { subscribe } from 'services/pubsub';

export default class AppHome extends LightningElement {
    activeApp = 'Home';
    appChannelSub = null;
    connectedCallback() {
        if (!this.appChannelSub) {
            this.appChannelSub = subscribe('appChannel', (data) => {
                this.activeApp = data.activeApp;
                console.log('activeApp: ', this.activeApp);
            });
        }
    }
    get isHome() {
        return this.activeApp === 'Home' ? '' : 'slds-hide';
    }
}
