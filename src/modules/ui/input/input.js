import { api, LightningElement } from 'lwc';

export default class Input extends LightningElement {
    @api label;
    @api minimumLength;
    @api placeholder;
    @api textValue;
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
