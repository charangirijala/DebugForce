import { api, LightningElement } from 'lwc';

export default class UtilityPanel extends LightningElement {
    @api panelToggle = false;

    get classComb() {
        return this.panelToggle
            ? 'slds-utility-panel slds-grid utility-panel slds-grid_vertical slds-is-open'
            : 'slds-utility-panel slds-grid utility-panel slds-grid_vertical';
    }

    handleMinimizer() {
        this.dispatchEvent(new CustomEvent('closepanel'));
    }
}
