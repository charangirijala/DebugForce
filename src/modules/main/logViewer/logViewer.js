/* eslint-disable inclusive-language/use-inclusive-words */
import { LightningElement, track } from 'lwc';
import { subscribe } from 'services/pubsub';

export default class logViewer extends LightningElement {
    errorCenterX = 0;
    hasError = true;
    errorPopoverOpen = false;
    goToPlaceholder = 'Go to line';
    goTohasLabel = false;
    reRenderVal = false;
    result = [];
    isLoading = false;
    isSearching = false;
    callStackToggle = false;
    LineNumMap = new Map();
    LineNumFocus = null;
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
    fieldOptions = [
        {
            label: 'Line',
            value: 'Line',
            type: 'text',
            selected: false
        },
        {
            label: 'Event',
            value: 'Event',
            type: 'picklist',
            selected: false
        }
    ];

    operatorOptions = [
        [
            { label: 'Equals', value: 'Equals' },
            { label: 'Not Equals', value: 'Not Equals' }
        ]
    ];
    /* 
      { label: "Equals", value: "Equals" },
      { label: "Not Equals", value: "Not Equals" },
      { label: "Greater Than", value: "Greater Than" },
      { label: "Greater Than or Equal", value: "Greater Than or Equal" },
      { label: "Less Than", value: "Less Than" },
      { label: "Less Than or Equal", value: "Less Than or Equal" },
      { label: "Contains", value: "Contains" }
     */

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
                    if (data.result) {
                        // console.log('Result: ', data.result);
                        this.result = data.result;
                    }
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
        if (this.isSearching) {
            const searchButton = this.template.querySelector('.search-button');
            if (searchButton) {
                const searchButtonRect = searchButton.getBoundingClientRect();
                const searchPopover =
                    this.template.querySelector('.data-search');
                if (searchPopover) {
                    searchPopover.style.right = `${window.innerWidth - 24 - searchButtonRect.right}px`;
                }
            }
            const lineElem = this.template.querySelectorAll('.log-row');
            if (lineElem.length > 0) {
                lineElem.forEach((ele) => {
                    ele.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                });
            }
            if (this.LineNumMap.size > 0) {
                if (this.LineNumMap.has(this.pageNumber)) {
                    const highEle = this.LineNumMap.get(this.pageNumber);
                    highEle.forEach((ele) => {
                        const element = this.template.querySelector(
                            `[data-logid="${ele}"]`
                        );

                        if (element) {
                            if (this.LineNumFocus !== ele) {
                                element.style.backgroundColor =
                                    'rgb(250, 255, 189)';
                            } else {
                                element.style.backgroundColor = 'yellow';
                                element.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                            }
                        }
                    });
                }
            }
        }
        console.log('Rerendering: ', this.activeFilters);
    }

    get hasActiveFilters() {
        return this.activeFilters.length > 0;
    }

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
        this.calculateFieldOptions();
        this.calculateOperatorOptions();
        this.fieldValue = this.activeFilters[this.currentEditFilterIdx].field;

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
        console.log('fieldValue: ', event.detail);
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

    calculateFieldOptions() {
        this.fieldValue = this.activeFilters[this.currentEditFilterIdx].field;
        this.fieldOptions = [
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
    }

    calculateOperatorOptions() {
        this.operatorValue =
            this.activeFilters[this.currentEditFilterIdx].operator;

        if (this.fieldValue === 'Line') {
            this.operatorOptions = [
                {
                    label: 'Equals',
                    value: 'Equals',
                    selected: this.operatorValue === 'Equals'
                },
                {
                    label: 'Not Equals',
                    value: 'Not Equals',
                    selected: this.operatorValue === 'Not Equals'
                },
                {
                    label: 'Contains',
                    value: 'Contains',
                    selected: this.operatorValue === 'Contains'
                }
            ];
        } else {
            this.operatorOptions = [
                {
                    label: 'Equals',
                    value: 'Equals',
                    selected: this.operatorValue === 'Equals'
                },
                {
                    label: 'Not Equals',
                    value: 'Not Equals',
                    selected: this.operatorValue === 'Not Equals'
                }
            ];
        }
    }

    handleSearch() {
        this.isSearching = !this.isSearching;
        if (this.isSearching === false) {
            this.processNoSearchRes();
        }
    }

    processSearchRes(event) {
        const lineNumbers = event.detail;
        this.LineNumMap = new Map();
        //console.log(lineNumbers);
        if (Array.isArray(lineNumbers)) {
            lineNumbers.forEach((l) => {
                if (this.linesPerPage !== 0) {
                    const pNum = Math.ceil(l / this.linesPerPage);
                    if (this.LineNumMap.has(pNum)) {
                        this.LineNumMap.get(pNum).push(l);
                    } else {
                        this.LineNumMap.set(pNum, [l]);
                    }
                }
            });
        }
        // console.log('Map: ', this.LineNumMap);
    }

    goToMatch(event) {
        const lineNumber = event.detail;
        // console.log('lineNumber: ', lineNumber);
        this.goToPage(lineNumber);
    }

    goToPage(lineNumber) {
        //calculate the pagenumber
        if (this.linesPerPage <= 0 || lineNumber <= 0) return;
        this.LineNumFocus = lineNumber;
        this.pageNumber = Math.ceil(lineNumber / this.linesPerPage);
        this.calculations();
    }

    processNoSearchRes() {
        this.LineNumFocus = null;
        if (this.LineNumMap.size > 0) {
            if (this.LineNumMap.has(this.pageNumber)) {
                const highEle = this.LineNumMap.get(this.pageNumber);
                highEle.forEach((ele) => {
                    const element = this.template.querySelector(
                        `[data-logid="${ele}"]`
                    );
                    if (element) {
                        element.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                    }
                });
            }
        }
        this.LineNumMap = new Map();
    }

    goToLine(event) {
        // console.log('linenumber', event.detail);
        const lNum = event.detail;
        this.goToPage(lNum);
    }

    handleErrorClick() {
        this.errorPopoverOpen = !this.errorPopoverOpen;
        const button = this.template.querySelector('.error-btn');
        const { horizontal, vertical } = this.getWidgetPadding();
        console.log('button', button);
        const rect = button.getBoundingClientRect();
        console.log('horizontal', horizontal);
        this.errorCenterX = (rect.left + rect.right) / 2 - 24;
        console.log('centerX', this.errorCenterX);
    }

    closeErrorPopover() {
        this.errorPopoverOpen = false;
    }

    getWidgetPadding() {
        const element = this.template.querySelector('.widget');
        const rect = element.getBoundingClientRect();
        console.log('rect', rect);
        // Calculate content width/height
        const contentWidth = element.clientWidth;
        const contentHeight = element.clientHeight;

        // Calculate padding
        const horizontalPadding = rect.width - contentWidth;
        const verticalPadding = rect.height - contentHeight;

        return {
            horizontal: horizontalPadding,
            vertical: verticalPadding
        };
    }
}
