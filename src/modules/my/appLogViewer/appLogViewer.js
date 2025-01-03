import { LightningElement } from 'lwc';
import { subscribe } from 'services/pubsub';
export default class AppLogViewer extends LightningElement {
    activeApp;
    appChannelSub = null;
    connectedCallback() {
        if (!this.appChannelSub) {
            this.appChannelSub = subscribe('appChannel', (data) => {
                this.activeApp = data.activeApp;
                // console.log('activeApp: ', this.activeApp);
            });
        }
    }
    get isLogViewer() {
        return this.activeApp === 'Log Viewer' ? '' : 'slds-hide';
    }
}
