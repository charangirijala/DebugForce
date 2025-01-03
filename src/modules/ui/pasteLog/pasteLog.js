import { LightningElement } from 'lwc';

import { publish, subscribe } from 'services/pubsub';

export default class PasteLog extends LightningElement {
    logText;

    handleLogChange(event) {
        // console.log('event', event.target.value);
        this.logText = event.target.value;
    }
    clearLog() {
        this.logText = '';
        this.template.querySelector('textarea').value = '';
        publish('logtext', []);
    }

    analyzeLog() {
        if (this.logText !== null && this.logText !== '') {
            const logData = this.logText.split(/\r\n|\n/);
            console.log('paste data length: ', logData.length);
            publish('logtext', logData);
        }
    }
}
