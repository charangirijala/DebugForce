import { LightningElement, track } from 'lwc';
import { publish, subscribe } from 'services/pubsub';

export default class FilOperatorCombobox extends LightningElement {
    comboboxClass =
        'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
    dropDownOpen = false;
    activeFilters = [];
    pickListVals = [];
    currentFilterIdx;
    @track options = [];
    filterSubscription = null;
    connectedCallback() {
        if (!this.filterSubscription) {
            this.filterSubscription = subscribe('filterChannel', (data) => {
                //  console.log('data', data);
                if (
                    Array.isArray(data.activeFilters) &&
                    data.activeFilters.length > 0
                ) {
                    this.activeFilters = data.activeFilters;
                    if (data.currentFilterIdx !== null) {
                        this.currentFilterIdx = data.currentFilterIdx;
                        let operator =
                            data.activeFilters[data.currentFilterIdx].operator;
                        let operatorLabel =
                            data.activeFilters[data.currentFilterIdx]
                                .operatorLabel;
                        if (operator === '' || operator === null)
                            this.selectedItem = 'Select Operator';
                        else {
                            if (
                                operatorLabel !== null &&
                                operatorLabel !== ''
                            ) {
                                this.selectedItem = operatorLabel;
                            }
                        }
                        let field =
                            data.activeFilters[data.currentFilterIdx].field;
                        this.generateOptions(field, operator);
                    }
                }

                if (data.isOperatorPopOpen === false) {
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
    selectedItem = 'Select Operator';

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
            isFieldPopOpen: false,
            isOperatorPopOpen: this.dropDownOpen,
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

        const operator = event.currentTarget.dataset.optionvalue;
        this.options = this.options.map((item) => {
            if (item.value === event.currentTarget.dataset.optionvalue) {
                this.selectedItem = item.label;
                return { ...item, isSelected: true };
            } else {
                return { ...item, isSelected: false };
            }
        });

        this.setOperatorOnFilter(operator);
    }

    generateOptions(field, operator) {
        //    console.log('op: ', operator);
        if (field === 'New Filter' || field === 'event') {
            this.options = [
                {
                    label: 'equals',
                    value: 'equals',
                    isSelected: operator === 'equals'
                },
                {
                    label: 'not equal to',
                    value: 'notEqualTo',
                    isSelected: operator === 'notEqualTo'
                }
            ];
        } else if (field === 'line') {
            this.options = [
                {
                    label: 'equals',
                    value: 'equals',
                    isSelected: operator === 'equals'
                },
                {
                    label: 'not equal to',
                    value: 'notEqualTo',
                    isSelected: operator === 'notEqualTo'
                },
                {
                    label: 'contains',
                    value: 'contains',
                    isSelected: operator === 'contains'
                }
            ];
        }
    }

    setOperatorOnFilter(operator) {
        this.activeFilters[this.currentFilterIdx].operator = operator;
        this.activeFilters[this.currentFilterIdx].operatorLabel =
            this.selectedItem;
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
