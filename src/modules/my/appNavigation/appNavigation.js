import { LightningElement, track } from 'lwc';
import { publish, subscribe } from 'services/pubsub';
// import { publish, MessageContext } from 'lightning/messageService';
// import STATE from '@salesforce/messageChannel/App_Service__c';

export default class AppNavigation extends LightningElement {
    activeApp = 'Home';
    //     @wire(MessageContext)
    //     messageContext;
    isVisible = true;
    classCombinationActive =
        'navItem slds-context-bar__item slds-shrink-none slds-is-active';
    classCombinationInactive =
        'navItem slds-context-bar__item slds-shrink-none';

    connectedCallback() {
        //    const payload = {
        //        activeApp: this.activeApp
        //    };
        //    publish(this.messageContext, STATE, payload);
        subscribe('appChannel', (data) => {
            this.activeApp = data.activeApp;
            this.navItems.map((item) => {
                if (item.label === this.activeApp) {
                    item.classCombination = this.classCombinationActive;
                } else {
                    item.classCombination = this.classCombinationInactive;
                }
                return item;
            });
        });
    }
    @track navItems = [
        {
            label: 'Home',
            id: 'home',
            classCombination:
                'navItem slds-context-bar__item slds-shrink-none slds-is-active'
        },
        {
            label: 'Log Viewer',
            id: 'logViewer',
            classCombination: 'navItem slds-context-bar__item slds-shrink-none'
        }
    ];

    handleNavigationItemClick(event) {
        event.preventDefault();
        // console.log(event.currentTarget.dataset.navitem);
        const selectedNav = event.currentTarget.dataset.navitem;
        // for (let i = 0; i < this.navItems.length; i++) {
        //     if (i === parseInt(selectedIdx, 10)) {
        //         const payload = {
        //             activeApp: this.navItems[i].label
        //         };
        //         publish('appChannel', payload);
        //         this.navItems[i].classCombination = this.classCombinationActive;
        //     } else {
        //         this.navItems[i].classCombination =
        //             this.classCombinationInactive;
        //     }
        // }

        this.navItems.map((item) => {
            if (item.id === selectedNav) {
                item.classCombination = this.classCombinationActive;
                const payload = {
                    activeApp: item.label
                };
                publish('appChannel', payload);
            } else {
                item.classCombination = this.classCombinationInactive;
            }
            return item;
        });

        // console.log(JSON.stringify(this.navItems));
    }
}
