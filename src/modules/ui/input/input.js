import { api, LightningElement } from 'lwc';

export default class Input extends LightningElement {
    @api label;
    @api minimumLength;
    @api placeholder;
    @api textValue;
    @api hasLabel;
    textValueInternal = '';
    @api type;
    hasError = false;
    inputClassList = 'slds-form-element';

    connectedCallback() {
        if (this.textValue) this.textValueInternal = this.textValue;
        this.checkMinLength();
    }

    handleInputChange(event) {
        this.textValueInternal = event.target.value;
        this.checkMinLength();
        this.dispatchEvent(
            new CustomEvent('valchange', {
                detail: {
                    textValue: this.textValueInternal,
                    hasError: this.hasError
                }
            })
        );
        console.log(this.textValueInternal);
    }
    handleOnInput(event) {
        const lineNum = event.target.value;
        if (!isNaN(lineNum) && lineNum !== '') {
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
                this.dispatchEvent(
                    new CustomEvent('inputchange', {
                        detail: parseInt(lineNum, 10)
                    })
                );
            }, 500);
        }
    }
    checkMinLength() {
        if (this.minimumLength && this.textValueInternal) {
            if (
                this.textValueInternal.length < parseInt(this.minimumLength, 10)
            ) {
                this.inputClassList = 'slds-form-element slds-has-error';
                this.hasError = true;
            } else {
                this.inputClassList = 'slds-form-element';
                this.hasError = false;
            }
        }
    }
}
