import { LightningElement, api } from 'lwc';

export default class HelpText extends LightningElement {
    @api content; // Text for the help tooltip
}
