import { LightningElement, track } from 'lwc';
import { publish, subscribe } from 'services/pubsub';
export default class FilFieldCombobox extends LightningElement {
    comboboxClass =
        'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
    dropDownOpen = false;
    activeFilters = [];
    currentFilterIdx;
    @track options = [];
    pickListVals = [];
    filterSubscription = null;
    selectedItem = 'Select Field';
    connectedCallback() {
        if (!this.filterSubscription) {
            this.filterSubscription = subscribe('filterChannel', (data) => {
                if (
                    Array.isArray(data.activeFilters) &&
                    data.activeFilters.length > 0
                ) {
                    this.activeFilters = data.activeFilters;
                    if (data.currentFilterIdx !== null) {
                        this.currentFilterIdx = data.currentFilterIdx;
                        let field =
                            data.activeFilters[data.currentFilterIdx].field;
                        if (field === 'New Filter' || field === null)
                            this.selectedItem = 'Select Field';
                        else if (field === 'line') this.selectedItem = 'Line';
                        else if (field === 'event') this.selectedItem = 'Event';
                        this.generateOptions(field);
                    }
                }

                if (data.isFieldPopOpen === false) {
                    this.closeDropdown();
                }

                if (
                    data.eventsPicklistValues !== null &&
                    data.eventsPicklistValues !== undefined
                ) {
                    this.pickListVals = data.eventsPicklistValues;
                }
            });
        }
    }

    onComboboxClick() {
        this.dropDownOpen = !this.dropDownOpen;
        if (this.dropDownOpen) {
            this.comboboxClass = this.comboboxClass + ' slds-is-open';
        } else {
            this.comboboxClass = this.comboboxClass.replace(
                ' slds-is-open',
                ''
            );
        }

        const payload = {
            currentFilterIdx: this.currentFilterIdx,
            activeFilters: this.activeFilters,
            isFieldPopOpen: this.dropDownOpen,
            isOperatorPopOpen: false,
            isValPopOpen: false,
            eventsPicklistValues: this.pickListVals
        };

        publish('filterChannel', payload);
    }

    closeDropdown() {
        this.dropDownOpen = false;
        this.comboboxClass = this.comboboxClass.replace(' slds-is-open', '');
    }

    onOptionClick(event) {
        //    console.log('onOptionClick');
        this.closeDropdown();
        const field = event.currentTarget.dataset.fieldvalue;
        this.options = this.options.map((item) => {
            if (item.value === event.currentTarget.dataset.fieldvalue) {
                this.selectedItem = item.label;
                return { ...item, isSelected: true };
            } else {
                return { ...item, isSelected: false };
            }
        });
        this.setFieldOnFilter(field);
    }

    generateOptions(field) {
        // console.log('field ', field);
        this.options = [
            {
                label: 'Line',
                value: 'line',
                isSelected: field === 'line'
            },
            {
                label: 'Event',
                value: 'event',
                isSelected: field === 'event'
            }
        ];
    }

    setFieldOnFilter(field) {
        this.activeFilters[this.currentFilterIdx].field = field;
        this.activeFilters[this.currentFilterIdx].operatorLabel = '';
        this.activeFilters[this.currentFilterIdx].operator = '';
        this.activeFilters[this.currentFilterIdx].value = '';
        this.activeFilters[this.currentFilterIdx].filterValues = [];
        this.activeFilters[this.currentFilterIdx].isEdited = true;
        this.activeFilters[this.currentFilterIdx].filterItemClass =
            'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited';
        const payload = {
            currentFilterIdx: this.currentFilterIdx,
            activeFilters: this.activeFilters,
            isFieldPopOpen: false,
            isOperatorPopOpen: false,
            isValPopOpen: false,
            eventsPicklistValues: this.pickListVals
        };
        publish('filterChannel', payload);
    }
}
