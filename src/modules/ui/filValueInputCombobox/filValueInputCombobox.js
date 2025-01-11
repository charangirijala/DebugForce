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
                // Update picklist values if provided
                if (data.eventsPicklistValues) {
                    this.pickListValues = [...data.eventsPicklistValues];
                }
                // Ensure activeFilters is an array and has data
                if (
                    Array.isArray(data.activeFilters) &&
                    data.activeFilters.length > 0
                ) {
                    // Create a new reference for activeFilters to ensure immutability
                    this.activeFilters = [...data.activeFilters];

                    if (
                        data.currentFilterIdx !== null &&
                        data.currentFilterIdx < this.activeFilters.length
                    ) {
                        this.currentFilterIdx = data.currentFilterIdx;

                        const currentFilter =
                            this.activeFilters[this.currentFilterIdx];
                        const { field, value, filterValues } = currentFilter;

                        // Reset or initialize filter properties based on field type
                        if (field === 'New Filter' || field === null) {
                            this.isFilterValuePicklist = false;
                            this.selectedItemPlaceHolder = 'Enter value...';
                            this.inputValue = '';
                        } else if (field === 'line') {
                            this.isFilterValuePicklist = false;
                            this.inputValue = value || '';
                            this.selectedItemPlaceHolder = 'Enter value...';
                        } else if (field === 'event') {
                            this.isFilterValuePicklist = true;

                            if (
                                Array.isArray(filterValues) &&
                                filterValues.length > 0
                            ) {
                                this.selectedEvents = filterValues;
                                this.selectedItemPlaceHolder = `${this.selectedEvents.length} events selected`;
                            } else {
                                this.selectedItemPlaceHolder = 'Select Event';
                                this.selectedEvents = [];
                            }

                            this.generateOptions();
                        }
                    } else {
                        console.warn(
                            'Invalid currentFilterIdx received:',
                            data.currentFilterIdx
                        );
                    }
                } else {
                    console.warn(
                        'Invalid or empty activeFilters received:',
                        data.activeFilters
                    );
                }

                // Handle dropdown close logic
                if (data.isValPopOpen === false) {
                    this.closeDropdown();
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

    filterPicklistValues() {
        if (
            !Array.isArray(this.pickListValues) ||
            !Array.isArray(this.activeFilters)
        ) {
            return [];
        }

        // Gather all values already used in 'event' filters
        const usedValues = new Set(
            this.activeFilters
                .filter(
                    (filter, idx) =>
                        filter.field === 'event' &&
                        idx !== this.currentFilterIdx
                ) // Only consider 'event' filters
                .flatMap((filter) => filter.filterValues || [])
        );
        // Return pickListValues excluding the used ones
        return this.pickListValues.filter(
            (option) =>
                !usedValues.has(option.value) ||
                this.checkEventSelected(option.value)
        );
    }
    generateOptions() {
        const availableOptions = this.filterPicklistValues(); // Filter out used values

        if (Array.isArray(availableOptions) && availableOptions.length > 0) {
            this.options = availableOptions.map((item) => ({
                label: item.label,
                value: item.value,
                isInUse: item.isInUse,
                isSelected: this.checkEventSelected(item.value)
            }));
        } else {
            this.options = [
                {
                    label: 'Oops!! looks like there are no available events!',
                    value: 'noevents',
                    isSelected: false,
                    isDisabled: true
                }
            ];
        }
        // console.log('picklistVals ops generated', this.options);
    }
    checkEventSelected(event) {
        if (this.selectedEvents.length === 0) return false;
        const found = this.selectedEvents.find((item) => item === event);
        return found === undefined ? false : true;
    }

    setEventsOnFilter() {
        if (
            !this.activeFilters ||
            this.currentFilterIdx === undefined ||
            this.selectedEvents === undefined
        ) {
            console.error('Required properties are not properly initialized.');
            return;
        }

        // Update the current active filter
        const currentFilter = this.activeFilters[this.currentFilterIdx];
        if (!currentFilter) {
            console.error(
                `No active filter found at index ${this.currentFilterIdx}.`
            );
            return;
        }

        currentFilter.filterValues = this.selectedEvents;
        currentFilter.value = this.selectedEvents.toString();
        currentFilter.isEdited = true;
        currentFilter.filterItemClass =
            'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited';

        // Update picklist values
        if (this.pickListValues) {
            this.pickListValues = this.pickListValues.map((item) => ({
                ...item
            }));
            //   console.log('Updated picklist values:', this.pickListValues);
        } else {
            console.warn('pickListValues is null or undefined.');
        }

        // Notify other components about the changes
        this.publishToChannel(false, false, true);
    }

    onInputValueFocus() {
        //    console.log('onInputValueFocus');
        this.publishToChannel(false, false, true);
    }

    onInputChange(event) {
        // Capture the input value
        this.inputValue = event.target.value;

        // Ensure currentFilterIdx is valid and activeFilters has content
        if (
            this.activeFilters.length > 0 &&
            this.currentFilterIdx !== undefined &&
            this.currentFilterIdx !== null
        ) {
            // Create a new updated filter object
            const updatedFilter = {
                ...this.activeFilters[this.currentFilterIdx],
                isPicklist: false,
                value: this.inputValue,
                isEdited: true,
                filterItemClass:
                    'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited'
            };

            // Replace the specific filter in the activeFilters array
            this.activeFilters = [
                ...this.activeFilters.slice(0, this.currentFilterIdx),
                updatedFilter,
                ...this.activeFilters.slice(this.currentFilterIdx + 1)
            ];

            //   console.log('Updated activeFilters:', this.activeFilters);

            // Trigger any required event or publish changes
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
