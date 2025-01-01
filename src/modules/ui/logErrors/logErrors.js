import { LightningElement, api } from 'lwc';

export default class LogErrors extends LightningElement {
    @api positionX;
    @api isOpen;

    @api errors;

    renderedCallback() {
        if (this.positionX) {
            let popoverSec = this.template.querySelector('section');
            if (popoverSec) {
                popoverSec.style.left = this.positionX + 'px';
            }
        }
    }

    closePopover() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    get hasErrors() {
        return this.errors.length > 0;
    }

    onLineClick(event) {
        const line = event.target.dataset.line;
        //    console.log('line', line);
        this.dispatchEvent(
            new CustomEvent('gotoline', {
                detail: parseInt(line, 10)
            })
        );
    }
}
