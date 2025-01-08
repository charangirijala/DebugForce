import { LightningElement, track } from 'lwc';
import { publish, subscribe } from 'services/pubsub';

export default class FilValueInputCombobox extends LightningElement {
    comboboxClass =
        'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
    dropDownOpen = false;
    isFilterValuePicklist = false;
    inputValue = '';
    pickListValues = [];
    activeFilters = [];
    currentFilterIdx;
    @track options = [];
    filterSubscription = null;
    selectedEvents = [];
    selectedItemPlaceHolder = 'enter value..';
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
                        let value =
                            data.activeFilters[data.currentFilterIdx].value;
                        let filterValues =
                            data.activeFilters[data.currentFilterIdx]
                                .filterValues;
                        if (field === 'New Filter' || field === null) {
                            this.isFilterValuePicklist = false;
                            this.selectedItemPlaceHolder = 'enter value..';
                            this.inputValue = '';
                        } else if (field === 'line') {
                            if (value !== '' && value !== null) {
                                this.inputValue = value;
                            } else {
                                this.selectedItemPlaceHolder = 'enter value..';
                                this.inputValue = '';
                            }
                            this.isFilterValuePicklist = false;
                        } else if (field === 'event') {
                            if (filterValues.length === 0) {
                                this.selectedItemPlaceHolder = 'Select Event';
                                this.selectedEvents = [];
                            } else {
                                this.selectedEvents = filterValues;
                                this.selectedItemPlaceHolder = `${this.selectedEvents.length} events selected`;
                            }
                            this.isFilterValuePicklist = true;
                            this.generateOptions();
                        }
                    }
                }

                if (data.isValPopOpen === false) {
                    this.closeDropdown();
                }

                if (
                    data.eventsPicklistValues !== undefined &&
                    data.eventsPicklistValues !== null
                )
                    this.pickListValues = data.eventsPicklistValues;
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

        this.publishToChannel(false, false, this.dropDownOpen);
    }

    closeDropdown() {
        this.dropDownOpen = false;
        this.comboboxClass = this.comboboxClass.replace(' slds-is-open', '');
    }

    onOptionClick(event) {
        //    console.log('onOptionClick');
        //    this.closeDropdown();
        //    const field = event.currentTarget.dataset.eventvalue;
        this.options = this.options.map((item) => {
            if (item.value === event.currentTarget.dataset.eventvalue) {
                this.selectedItemPlaceHolder = item.label;
                const temp =
                    item.isSelected !== undefined && item.isSelected === true
                        ? false
                        : true;
                this.manageSelectedEvents(item.value, temp);
                this.setEventsOnFilter();
                return { ...item, isSelected: temp };
            } else {
                return item;
            }
        });
        //    this.setFieldOnFilter(field);
    }
    handleNoOptions() {
        this.closeDropdown();
        this.publishToChannel(false, false, false);
    }
    generateOptions() {
        if (
            Array.isArray(this.pickListValues) &&
            this.pickListValues.length > 0
        ) {
            this.options = this.pickListValues.map((item) => {
                return {
                    label: item.label,
                    value: item.value,
                    isSelected: this.checkEventSelected(item.value)
                };
            });
        } else {
            this.options = [
                {
                    label: 'Oops!! looks like there are no events!!..',
                    value: 'noevents',
                    isSelected: false,
                    isDisabled: true
                }
            ];
        }
        console.log('picklistVals ops generated', this.options);
    }
    checkEventSelected(event) {
        if (this.selectedEvents.length === 0) return false;
        const found = this.selectedEvents.find((item) => item === event);
        return found === undefined ? false : true;
    }
    setEventsOnFilter() {
        this.activeFilters[this.currentFilterIdx].filterValues =
            this.selectedEvents;
        this.activeFilters[this.currentFilterIdx].value =
            this.selectedEvents.toString();
        this.activeFilters[this.currentFilterIdx].isEdited = true;
        this.activeFilters[this.currentFilterIdx].filterItemClass =
            'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited';

        this.publishToChannel(false, false, true);
    }

    onInputValueFocus() {
        //    console.log('onInputValueFocus');
        this.publishToChannel(false, false, true);
    }

    onInputChange(event) {
        //    console.log('Event val: ', event.target.value);
        this.inputValue = event.target.value;
        if (
            this.activeFilters.length > 0 &&
            this.currentFilterIdx !== undefined &&
            this.currentFilterIdx !== null
        ) {
            this.activeFilters[this.currentFilterIdx].isPicklist = false;
            this.activeFilters[this.currentFilterIdx].value = this.inputValue;
            this.activeFilters[this.currentFilterIdx].isEdited = true;
            this.activeFilters[this.currentFilterIdx].filterItemClass =
                'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited';
            this.publishToChannel(false, false, false);
        }
    }

    publishToChannel(fieldPop, operatorPop, valPop) {
        const payload = {
            currentFilterIdx: this.currentFilterIdx,
            activeFilters: this.activeFilters,
            isFieldPopOpen: fieldPop,
            isOperatorPopOpen: operatorPop,
            isValPopOpen: valPop,
            eventsPicklistValues: this.pickListValues
        };
        publish('filterChannel', payload);
    }

    manageSelectedEvents(event, isSelected) {
        if (isSelected) {
            this.selectedEvents.push(event);
        } else {
            this.selectedEvents.forEach((item, idx) => {
                if (item === event) {
                    this.selectedEvents.splice(idx, 1);
                }
            });
        }

        if (this.selectedEvents.length == 1) {
            this.selectedItemPlaceHolder = this.selectedEvents[0];
        } else if (this.selectedEvents.length == 0) {
            this.selectedItemPlaceHolder = 'Select Event';
        } else {
            this.selectedItemPlaceHolder = `${this.selectedEvents.length} events selected`;
        }
    }
}
