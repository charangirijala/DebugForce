/* eslint-disable inclusive-language/use-inclusive-words */
import { LightningElement, track } from 'lwc';
import { subscribe } from 'services/pubsub/';

export default class logViewer extends LightningElement {
    reRenderVal = false;
    isLoading = false;
    callStackToggle = false;
    fieldValue;
    operatorValue;
    filterValue = '';
    filterPickListValue = [];
    filterPickListMaster = [];
    logChannelSub = null;
    isFilterEditing = false;
    isFilterPopOverShowing = false;
    currentEditFilterIdx;
    popoverTop = 0;
    get fieldOptions() {
        const opts = [
            {
                label: 'Line',
                value: 'Line',
                type: 'text',
                selected: this.fieldValue === 'Line'
            },
            {
                label: 'Event',
                value: 'Event',
                type: 'picklist',
                selected: this.fieldValue === 'Event'
            }
        ];
        return opts;
    }
    get operatorOptions() {
        /* 
      { label: "Equals", value: "Equals" },
      { label: "Not Equals", value: "Not Equals" },
      { label: "Greater Than", value: "Greater Than" },
      { label: "Greater Than or Equal", value: "Greater Than or Equal" },
      { label: "Less Than", value: "Less Than" },
      { label: "Less Than or Equal", value: "Less Than or Equal" },
      { label: "Contains", value: "Contains" }
     */

        if (this.fieldValue === 'Line') {
            return [
                { label: 'Equals', value: 'Equals' },
                { label: 'Not Equals', value: 'Not Equals' },
                { label: 'Contains', value: 'Contains' }
            ];
        }
        return [
            { label: 'Equals', value: 'Equals' },
            { label: 'Not Equals', value: 'Not Equals' }
        ];
    }

    get isFilterValuePicklist() {
        return (
            this.fieldValue === 'Event' && this.filterPickListMaster.length > 0
        );
    }
    get filterValueOptions() {
        let options = this.filterPickListMaster;
        let opts = options.map((item) => ({
            ...item,
            selected: this.filterPickListValue.includes(item.value)
        }));
        console.log('Options generated: ', opts);
        return opts;
    }

    @track activeFilters = [
        {
            id: 0,
            field: 'Line',
            operator: 'Equals',
            value: '2019-12-18T22:00:00.000Z',
            isPicklist: false,
            filterValues: [],
            isEdited: false,
            isActive: true,
            filterItemClass:
                'slds-filters__item slds-grid slds-grid_vertical-align-center'
        },
        {
            id: 1,
            field: 'Event',
            operator: 'Equals',
            isPicklist: true,
            value: '',
            filterValues: [
                'HEAP_ALLOCATE',
                'CODE_UNIT_STARTED',
                'CODE_UNIT_FINISHED'
            ],
            isEdited: false,
            isActive: true,
            filterItemClass:
                'slds-filters__item slds-grid slds-grid_vertical-align-center'
        }
    ];
    dynamicHeight;
    filterClass =
        'slds-panel slds-size_medium slds-panel_docked slds-panel_docked-right slds-panel_drawer filter-panel slds-hidden';
    pageNumberClass = 'slds-input';
    linesPerPageClass = 'slds-input';
    @track fileMetadata = {
        fileName: '',
        nofLines: 0,
        nofCodeUnits: 0,
        nofMethodUnits: 0
    };
    noOfPages = 0;
    pageNumber = 0;
    linesPerPage = 100;
    @track displayedData = [];
    fileData = [];
    //     @wire(MessageContext)
    //     messageContext;

    connectedCallback() {
        if (!this.logChannelSub) {
            subscribe('logChannel', (data) => {
                if (data) {
                    if (data.fileData) {
                        this.fileData = data.fileData;
                        this.pageNumber = 1;
                        this.noOfPages = Math.ceil(
                            this.fileData.length / this.linesPerPage
                        );
                        this.calculations();
                    }
                    if (data.fileMetadata)
                        this.fileMetadata = data.fileMetadata;
                    if (data.eventsPicklistValues) {
                        if (Array.isArray(data.eventsPicklistValues)) {
                            this.filterPickListMaster =
                                data.eventsPicklistValues.map((str) => ({
                                    value: str,
                                    label: str
                                }));
                        }
                    }
                }
            });
        }
    }

    get ShowFilterSave() {
        return this.isFilterEditing === true &&
            this.isFilterPopOverShowing === false
            ? true
            : false;
    }

    renderedCallback() {
        const popover = this.template.querySelector('section');

        if (popover) {
            const popoverHeight = popover.getBoundingClientRect().height / 2;
            console.log('PopoverTOp: ', this.popoverTop);
            const height = this.popoverTop - popoverHeight;
            popover.style.top = `${height}px `;
        }

        console.log('Rerendering: ', this.activeFilters);
    }

    get hasActiveFilters() {
        return this.activeFilters.length > 0;
    }

    // subscribeToMessageChannel() {
    // console.log("Subscribe called");
    //    if (!this.logChannelSub) {
    //        this.logChannelSub = subscribe(
    //            this.messageContext,
    //            STATE,
    //            (message) => {
    //                this.setFileData(message);
    //            },
    //            { scope: APPLICATION_SCOPE }
    //        );
    //        this.logChannelSub = true;
    //    }
    // }

    // setFileData(message) {
    //     if (message !== null && message !== undefined) {
    //         // console.log("[LogPreviewer.js] setFileData called", message);
    //         if (message.fileData !== undefined && message.fileData !== null) {
    //             this.fileData = message.fileData;
    //             this.pageNumber = 1;
    //             this.noOfPages = Math.ceil(
    //                 this.fileData.length / this.linesPerPage
    //             );
    //             this.calculations();
    //         }
    //         if (
    //             message.fileMetadata !== undefined &&
    //             message.fileMetadata !== null
    //         ) {
    //             this.fileMetadata = message.fileMetadata;
    //         }
    //         if (
    //             message.eventsPicklistValues !== undefined &&
    //             message.eventsPicklistValues !== null
    //         ) {
    //             if (Array.isArray(message.eventsPicklistValues)) {
    //                 this.filterPickListMaster =
    //                     message.eventsPicklistValues.map((str) => ({
    //                         value: str,
    //                         label: str
    //                     }));
    //             }
    //         }
    //     }
    // }
    onLinesPerPageChange(event) {
        // console.log("Page Change: ", event.target.value);
        let input = parseInt(event.target.value, 10);
        if (input >= 1 && input <= 1000) {
            // this.linesPerPageClass = "slds-input";
            this.linesPerPage = input;
            this.pageNumber = 1;
            this.noOfPages = Math.ceil(
                this.fileData.length / this.linesPerPage
            );
            this.calculations();
        }
    }

    calculations() {
        if (this.pageNumber !== 0) {
            this.displayedData = this.fileData.slice(
                this.linesPerPage * (this.pageNumber - 1),
                this.linesPerPage * this.pageNumber
            );
        }
    }

    onPageNumberChange(event) {
        // console.log("Page Change: ", event.target.value);
        let input = parseInt(event.target.value, 10);
        if (input >= 1 && input <= this.noOfPages) {
            // this.pageNumberClass = "slds-input";
            this.pageNumber = input;
            this.calculations();
        }
    }
    nextHandler() {
        if (this.pageNumber + 1 <= this.noOfPages) {
            this.pageNumber++;
            this.calculations();
        }
    }
    prevHandler() {
        if (this.pageNumber - 1 >= 1) {
            this.pageNumber--;
            this.calculations();
        }
    }

    closeFilter() {
        this.filterClass =
            'slds-panel slds-size_medium slds-panel_docked slds-panel_docked-right slds-panel_drawer filter-panel slds-hidden';
    }
    openFilter() {
        this.filterClass =
            'slds-panel slds-size_medium slds-panel_docked slds-panel_docked-right slds-panel_drawer filter-panel slds-is-open';
    }

    removeFilter(event) {
        const filterIndex = event.target.dataset.id;
        this.isFilterPopOverShowing = false;
        let idx = 0;
        console.log('[LogPreviewer.js] removeFilter called', filterIndex);
        if (filterIndex >= 0) {
            // only splice array when item is found
            this.activeFilters.splice(filterIndex, 1); // 2nd parameter means remove one item only
        }
        this.activeFilters.forEach((filter) => {
            filter.id = idx++;
        });
        this.currentEditFilterIdx = 0;
    }

    addFilter() {
        // if (!this.isFilterEditing) {
        this.isFilterEditing = true;
        this.isFilterPopOverShowing = true;
        this.filterPickListValue = [];
        this.currentEditFilterIdx = this.activeFilters.length;
        const newFilter = {
            id: this.activeFilters.length,
            field: 'New Filter',
            operator: '',
            value: '',
            isPicklist: false,
            filterValues: [],
            isActive: false,
            isEdited: true,
            filterItemClass:
                'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited'
        };
        this.activeFilters.push(newFilter);
        // }
    }

    removeAllFilters() {
        this.isFilterEditing = false;
        this.handlePopoverClose();
        this.activeFilters = [];
    }

    cancelFilterEdit() {
        this.isFilterEditing = false;
        this.isFilterPopOverShowing = false;
        this.activeFilters.pop();
    }

    saveFilterEdit() {
        this.isFilterEditing = false;
        this.handlePopoverClose();
        let idxToRemove = [];
        for (let i = 0; i < this.activeFilters.length; i++) {
            let filter = this.activeFilters[i];
            if (
                filter.field === 'Line' &&
                filter.operator !== '' &&
                filter.value !== ''
            ) {
                filter.isActive = true;
                filter.filterItemClass =
                    'slds-filters__item slds-grid slds-grid_vertical-align-center';
            } else if (
                filter.field === 'Event' &&
                filter.operator !== '' &&
                filter.filterValues.length > 0
            ) {
                filter.isActive = true;
                filter.filterItemClass =
                    'slds-filters__item slds-grid slds-grid_vertical-align-center';
            } else {
                //Addition pop all filters where isactive=false
                idxToRemove.push(i);
            }
        }

        idxToRemove.forEach((idx) => {
            this.activeFilters.splice(idx, 1);
        });
    }

    onFilterElementClick(event) {
        this.isFilterEditing = true;
        this.isFilterPopOverShowing = true;
        this.currentEditFilterIdx = event.currentTarget.dataset.id;
        this.fieldValue = this.activeFilters[this.currentEditFilterIdx].field;
        this.operatorValue =
            this.activeFilters[this.currentEditFilterIdx].operator;

        if (
            Array.isArray(this.activeFilters[this.currentEditFilterIdx].value)
        ) {
            //this is for picklist
            this.filterValue = '';
            this.filterPickListValue =
                this.activeFilters[this.currentEditFilterIdx].filterValues;
        } else {
            // this.reRenderVal = !this.reRenderVal;
            console.log(
                'reRenderVal; ',
                this.activeFilters[this.currentEditFilterIdx].value,
                'rerender item:',
                this.activeFilters[this.currentEditFilterIdx]
            );
            this.filterValue =
                this.activeFilters[this.currentEditFilterIdx].value;
        }
        console.log('Filter ID;' + event.currentTarget.dataset.id);
        this.activeFilters[this.currentEditFilterIdx].filterItemClass =
            'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited';
        const filterPanel = this.template.querySelector('.filter-panel');
        const coord = filterPanel.getBoundingClientRect();
        console.log('X; ' + coord.x + ' Y:', coord.y + 'Width: ', coord.width);
        console.log(typeof event.clientY);
        console.log(typeof coord.Y);
        this.popoverTop = event.clientY - coord.y;
        console.log('popover cal; ', this.popoverTop);
    }

    handleFieldChange(event) {
        const fieldVal = event.detail;
        if (fieldVal && Array.isArray(fieldVal) && fieldVal.length !== 0) {
            console.log('Field Selected ', fieldVal[0].value);
            this.fieldValue = this.activeFilters[
                this.currentEditFilterIdx
            ].field = fieldVal[0].value;
            this.activeFilters[this.currentEditFilterIdx].isPicklist =
                this.fieldValue === 'Event' ? true : false;
        }
    }

    handleOperatorChange(event) {
        const opVal = event.detail;
        if (opVal && Array.isArray(opVal) && opVal.length !== 0) {
            console.log('Operator Selected ', opVal[0].value);
            this.operatorValue = this.activeFilters[
                this.currentEditFilterIdx
            ].operator = opVal[0].value;
        }
    }

    handleFilterValueChange(event) {
        // this.filterValue = event.detail;
        if (this.currentEditFilterIdx < this.activeFilters.length) {
            this.activeFilters[this.currentEditFilterIdx].filterValues =
                event.detail.map((filter) => {
                    return filter.value;
                });
        }
        this.filterPickListValue = [];
        console.log('Selected items: ', this.filterPickListValue);
    }

    handlePopoverClose() {
        this.isFilterPopOverShowing = false;
        this.fieldValue = null;
        this.operatorValue = null;
        this.filterValue = '';
        this.filterPickListValue = [];
    }

    handleFilterTextChange(event) {
        console.log('Filter Text Changed ', event.detail);
        this.filterValue = this.activeFilters[this.currentEditFilterIdx].value =
            event.detail.textValue;
    }

    handleCallStackChange() {
        this.callStackToggle = !this.callStackToggle;
    }
    closeCallStack() {
        this.callStackToggle = false;
    }
}
