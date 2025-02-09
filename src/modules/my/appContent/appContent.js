import { LightningElement } from 'lwc';
import { subscribe } from 'services/pubsub';
// import {
//     subscribe,
//     MessageContext,
//     APPLICATION_SCOPE
// } from 'lightning/messageService';
// import STATE from '@salesforce/messageChannel/App_Service__c';

export default class AppContent extends LightningElement {
    //     @wire(MessageContext)
    //     messageContext;
    activeApp;
    appChannelSub = null;
    connectedCallback() {
        if (!this.appChannelSub) {
            this.appChannelSub = subscribe('appChannel', (data) => {
                //  console.log('data recieved: ', data);
                this.activeApp = data.activeApp;
            });
        }
    }

    //     subscribeToMessageChannel() {
    //    if (!this.appChannelSub) {
    //        this.appChannelSub = subscribe(
    //            this.messageContext,
    //            STATE,
    //            (message) => {
    //                this.setActiveApp(message);
    //            },
    //            { scope: APPLICATION_SCOPE }
    //        );
    //    }
    //     }

    setActiveApp(message) {
        this.activeApp = message.activeApp;
    }
    get isHome() {
        return this.activeApp === 'Home' ? '' : 'slds-hide';
    }

    get isRawLogViewer() {
        return this.activeApp === 'Log Viewer' ? '' : 'slds-hide';
    }
}
