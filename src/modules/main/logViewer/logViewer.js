/* eslint-disable inclusive-language/use-inclusive-words */
import { LightningElement, track } from 'lwc';
import filterData from 'services/filters';
import { publish, subscribe } from 'services/pubsub';

export default class logViewer extends LightningElement {
    isUnitView = false;
    unitViewBoundaries = {
        startTime: 0,
        endTime: 0
    };
    errorCenterX = 0;
    errors = [];
    errorPopoverOpen = false;
    lvTitle = '';
    lvTitleHead = 'Log Viewer';
    filterChannelSub = null;
    goToPlaceholder = 'Go to line';
    filterHasLabel = true;
    goTohasLabel = false;
    reRenderVal = false;
    result = [];
    isLoading = false;
    isSearching = false;
    callStackToggle = false;
    LineNumMap = new Map();
    LineNumFocus = null;
    filterPickListMaster = [];
    previousFilters = [];
    logChannelSub = null;
    isFilterEditing = false;
    isFilterPopOverShowing = false;
    currentEditFilterIdx;
    popoverTop = 0;

    get popoverClass() {
        return this.isFilterPopOverShowing ? '' : 'slds-hide';
    }
    get filterIconStyle() {
        return this.activeFilters.length === 0
            ? 'action-bar-action-toggleFilter reportAction report-action-toggleFilter filtersButton slds-button slds-button_icon-border'
            : 'action-bar-action-toggleFilter reportAction report-action-toggleFilter icon-active-filters filtersButton slds-button slds-button_icon-border';
    }
    @track activeFilters = [];
    filterClass =
        'slds-panel slds-size_medium slds-panel_docked slds-panel_docked-right slds-panel_drawer filter-panel slds-hidden';
    pageNumberClass = 'slds-input';
    linesPerPageClass = 'slds-input';
    @track fileMetadata = {
        fileName: '',
        nofLines: 0,
        nofCodeUnits: 0,
        nofMethodUnits: 0,
        soqlCount: 0,
        dmlCount: 0
    };
    noOfPages = 0;
    pageNumber = 0;
    linesPerPage = 100;
    @track displayedData = [];
    dataInUse = [];
    fileData = [];
    //     @wire(MessageContext)
    //     messageContext;

    connectedCallback() {
        if (!this.logChannelSub) {
            this.logChannelSub = subscribe('logChannel', (data) => {
                if (data) {
                    if (data.fileData) {
                        this.fileData = data.fileData;
                        this.dataInUse = data.fileData;
                        this.pageNumber = 1;
                        this.noOfPages = Math.ceil(
                            this.dataInUse.length / this.linesPerPage
                        );
                        this.calculations();
                    }
                    if (data.fileMetadata) {
                        this.fileMetadata = data.fileMetadata;
                        this.lvTitle =
                            this.fileMetadata.fileName !== ''
                                ? this.fileMetadata.fileName
                                : 'Log';
                        this.errors = data.fileMetadata.errors;
                    }

                    if (data.result) {
                        // console.log('Result: ', data.result);
                        this.result = data.result;
                    }
                    if (data.eventsPicklistValues) {
                        if (Array.isArray(data.eventsPicklistValues)) {
                            this.filterPickListMaster =
                                data.eventsPicklistValues.map((str) => ({
                                    value: str,
                                    label: str,
                                    isInUse: false
                                }));
                            const payload = {
                                currentFilterIdx: null,
                                activeFilters: this.activeFilters,
                                isFieldPopOpen: false,
                                isOperatorPopOpen: false,
                                isValPopOpen: false,
                                eventsPicklistValues: this.filterPickListMaster
                            };
                            // console.log('payload picklistVals: ', payload);
                            publish('filterChannel', payload);
                        }
                    }
                }
            });
        }

        if (!this.filterChannelSub) {
            this.filterChannelSub = subscribe('filterChannel', (data) => {
                if (data.activeFilters) {
                    this.activeFilters = data.activeFilters;
                }
            });
        }
        this._boundCloseFilterPopoverOnClick =
            this.closeFilterPopoverOnClick.bind(this);
        window.addEventListener('click', this._boundCloseFilterPopoverOnClick);
    }

    disconnectedCallback() {
        window.removeEventListener(
            'click',
            this._boundCloseFilterPopoverOnClick
        );
    }

    get errCount() {
        return this.errors.length;
    }

    renderedCallback() {
        this.setFilterPopoverStyle();
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
                    highEle.forEach(({ logLineNum, pageLineNum }) => {
                        const element = this.template.querySelector(
                            `[data-logid="${logLineNum}"]`
                        );

                        if (element) {
                            if (this.LineNumFocus !== pageLineNum) {
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
        console.log(
            'Rerendering: activeFilters:',
            this.activeFilters,
            ' Prev filters: ',
            this.previousFilters
        );
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
                this.dataInUse.length / this.linesPerPage
            );
            this.calculations();
        }
    }
    refreshPages() {
        this.noOfPages = Math.ceil(this.dataInUse.length / this.linesPerPage);
        this.pageNumber = this.noOfPages === 0 ? 0 : 1;
        this.calculations();
    }
    calculations() {
        if (this.dataInUse.length === 0) {
            this.displayedData = [];
            return;
        }
        if (this.pageNumber !== 0) {
            this.displayedData = this.dataInUse.slice(
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

    // ################# FILTERS START#########################################################

    closeFilter() {
        this.previousFilters = null;
        this.filterClass =
            'slds-panel slds-size_medium slds-panel_docked slds-panel_docked-right slds-panel_drawer filter-panel slds-hidden';
    }
    openFilter() {
        if (this.filterClass.includes('slds-is-open')) {
            this.closeFilter();
        } else {
            this.previousFilters = JSON.parse(
                JSON.stringify(this.activeFilters)
            );
            // console.log('openFilter called: ', this.previousFilters);
            this.filterClass =
                'slds-panel slds-size_medium slds-panel_docked slds-panel_docked-right slds-panel_drawer filter-panel slds-is-open';
        }
    }

    get ShowFilterSave() {
        return (
            this.isFilterEditing &&
            this.activeFilters.some((filter) => filter.isEdited === true)
        );
    }

    removeFilter(event) {
        const filterIndex = event.target.dataset.filterid;
        this.isFilterPopOverShowing = false;
        let idx = 0;
        // console.log('[LogPreviewer.js] removeFilter called', filterIndex);
        if (filterIndex >= 0) {
            // only splice array when item is found
            this.activeFilters.splice(filterIndex, 1); // 2nd parameter means remove one item only
        }
        this.activeFilters.forEach((filter) => {
            filter.id = idx++;
        });
        this.currentEditFilterIdx = null;
        this.previousFilters = JSON.parse(JSON.stringify(this.activeFilters));
        this.filterDataHelper();
    }

    filterDataHelper() {
        if (
            this.activeFilters.length > 0 &&
            this.fileData.length > 0 &&
            this.fileData !== undefined &&
            this.fileData !== null
        ) {
            if (this.isUnitView) {
                this.dataInUse = filterData(
                    this.activeFilters,
                    this.fileData.slice(
                        this.unitViewBoundaries.startTime - 1,
                        this.unitViewBoundaries.endTime
                    )
                );
            } else {
                this.dataInUse = filterData(this.activeFilters, this.fileData);
            }

            // console.log('filtered data: ', this.dataInUse);
            this.refreshPages();
        } else {
            if (this.isUnitView) {
                this.dataInUse = this.fileData.slice(
                    this.unitViewBoundaries.startTime - 1,
                    this.unitViewBoundaries.endTime
                );
            } else {
                this.dataInUse = this.fileData;
            }
            this.refreshPages();
        }
    }

    addFilter() {
        // if (!this.isFilterEditing) {
        this.isFilterEditing = true;
        this.isFilterPopOverShowing = true;
        // this.filterPickListValue = [];
        this.currentEditFilterIdx = this.activeFilters.length;
        const newFilter = {
            id: this.activeFilters.length,
            field: 'New Filter',
            operator: '',
            operatorLabel: '',
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
        const payload = {
            currentFilterIdx: newFilter.id,
            activeFilters: this.activeFilters,
            isFieldPopOpen: false,
            isOperatorPopOpen: false,
            isValPopOpen: false,
            eventsPicklistValues: this.filterPickListMaster
        };

        publish('filterChannel', payload);
    }

    removeAllFilters() {
        this.isFilterEditing = false;
        this.handlePopoverClose();
        this.activeFilters = [];
        this.previousFilters = [];

        this.dataInUse = this.isUnitView
            ? this.fileData.slice(
                  this.unitViewBoundaries.startTime - 1,
                  this.unitViewBoundaries.endTime
              )
            : this.fileData;
        this.refreshPages();
    }

    cancelFilterEdit() {
        this.isFilterEditing = false;
        this.isFilterPopOverShowing = false;
        // console.log('prev filters: ', this.previousFilters);
        if (this.previousFilters === null) {
            this.activeFilters = [];
        } else {
            this.activeFilters = JSON.parse(
                JSON.stringify(this.previousFilters)
            );
        }
    }

    saveFilterEdit() {
        this.isFilterEditing = false;
        this.handlePopoverClose();

        for (let i = 0; i < this.activeFilters.length; i++) {
            let filter = this.activeFilters[i];
            filter.isEdited = false;
            filter.filterItemClass =
                'slds-filters__item slds-grid slds-grid_vertical-align-center';
            if (
                filter.field === 'line' &&
                filter.operator !== '' &&
                filter.value !== ''
            ) {
                filter.isActive = true;
            } else if (
                filter.field === 'event' &&
                filter.operator !== '' &&
                filter.filterValues.length > 0
            ) {
                filter.isActive = true;
            } else {
                filter.isActive = false;
            }
        }

        this.activeFilters = this.activeFilters.filter((item) => {
            return item.isActive === true;
        });

        this.activeFilters.forEach((item, idx) => {
            item.id = idx;
        });

        this.previousFilters = JSON.parse(JSON.stringify(this.activeFilters));

        //call filterData from filters
        this.filterDataHelper();
    }

    closeFilterPopoverOnClick(event) {
        const clickedX = event.clientX;
        const clickedY = event.clientY;
        let isInBoundary = false;
        let isInFilterBoundary = false;
        // console.log(
        //     'clicked on window x:',
        //     event.clientX,
        //     'y: ',
        //     event.clientY
        // );
        const popover = this.template.querySelector('.slds-popover');
        const filterPanel = this.template.querySelector('.filter-panel');

        // console.log(popover);
        if (popover && filterPanel) {
            // console.log('pop boundaries: ', popover.getBoundingClientRect());

            const boundaries = popover.getBoundingClientRect();
            const filterBoundaries = filterPanel.getBoundingClientRect();
            const filXLeft = filterBoundaries.left;
            const filXRight = filterBoundaries.right;
            const filYTop = filterBoundaries.top;
            const filYBottom = filterBoundaries.bottom;
            const xLeft = boundaries.left;
            const xRight = boundaries.right;
            const yTop = boundaries.top;
            const yBottom = boundaries.bottom;

            if (xLeft !== 0 && xRight !== 0 && yTop !== 0 && yBottom !== 0) {
                const childComp = this.template.querySelector(
                    'ui-fil-value-input-combobox'
                );
                const eventDropdown =
                    childComp.shadowRoot.querySelector('.event-dropdown');

                isInBoundary =
                    clickedX > xLeft &&
                    clickedX < xRight &&
                    clickedY > yTop &&
                    clickedY < yBottom
                        ? true
                        : false;
                isInFilterBoundary =
                    clickedX > filXLeft &&
                    clickedX < filXRight &&
                    clickedY > filYTop &&
                    clickedY < filYBottom
                        ? true
                        : false;
                // console.log('clicked in boundary: ', isInBoundary);
                if (eventDropdown) {
                    // console.log(
                    //     'Dropdown activated: ',
                    //     eventDropdown.getBoundingClientRect()
                    // );
                    const dropdownBoundaries =
                        eventDropdown.getBoundingClientRect();
                    const dropXLeft = dropdownBoundaries.left;
                    const dropXRight = dropdownBoundaries.right;
                    const dropYTop = dropdownBoundaries.top;
                    const dropYBottom = dropdownBoundaries.bottom;
                    if (
                        dropXLeft !== 0 &&
                        dropXRight !== 0 &&
                        dropYTop !== 0 &&
                        dropYBottom !== 0
                    ) {
                        isInFilterBoundary =
                            clickedX > dropXLeft &&
                            clickedX < dropXRight &&
                            clickedY > dropYTop &&
                            clickedY < dropYBottom
                                ? true
                                : false;
                    }
                }
                if (isInBoundary === false && isInFilterBoundary === false) {
                    if (this.isFilterPopOverShowing) {
                        this.isFilterPopOverShowing = false;
                    }
                }
            }
        }
    }

    onFilterElementClick(event) {
        this.currentEditFilterIdx = event.currentTarget.dataset.filterid;

        const payload = {
            currentFilterIdx: this.currentEditFilterIdx,
            activeFilters: this.activeFilters,
            isFieldPopOpen: false,
            isOperatorPopOpen: false,
            isValPopOpen: false,
            eventsPicklistValues: this.filterPickListMaster
        };
        publish('filterChannel', payload);
        if (this.isFilterEditing === true) {
            this.setFilterPopoverStyle();
        }
        this.isFilterEditing = true;
        this.isFilterPopOverShowing = true;
        // console.log('Filter ID;' + event.currentTarget.dataset.id);
        // this.activeFilters[this.currentEditFilterIdx].filterItemClass =
        //     'slds-filters__item slds-grid slds-grid_vertical-align-center filter-being-edited';
    }

    handlePopoverClose() {
        this.isFilterPopOverShowing = false;
    }

    setFilterPopoverStyle() {
        // console.log('style popobver: ', this.isFilterPopOverShowing);
        if (this.isFilterPopOverShowing) {
            const popover = this.template.querySelector('.popover-section');
            const filterPanel = this.template.querySelector('.filter-panel');
            const filterPanelTop = filterPanel.getBoundingClientRect().top;
            // console.log(
            //     'panel boundaries: ',
            //     filterPanel.getBoundingClientRect()
            // );
            if (
                this.currentEditFilterIdx !== null &&
                this.currentEditFilterIdx !== undefined
            ) {
                const filter = this.template.querySelector(
                    `[data-filterid="${this.currentEditFilterIdx}"]`
                );
                const popoverCenter =
                    popover.getBoundingClientRect().height / 2;
                // console.log('popovercenter: ', popoverCenter);

                if (filter) {
                    const filterBoundaries = filter.getBoundingClientRect();
                    const filterCenter = filterBoundaries.height / 2;
                    // console.log('filter boundaries: ', filterBoundaries);
                    // console.log('Filter center: ', filterCenter);
                    const top =
                        filterBoundaries.top +
                        filterCenter -
                        filterPanelTop -
                        popoverCenter;
                    // console.log('top>', top);
                    popover.style.top = `${top}px`;
                }
            }
        }
    }

    //################# FILTERS END ############################################################

    //################################# SEARCH FUNCTIONALITY ##################################
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
                    let pageLineNum = 0;
                    const dataIndex = this.dataInUse.findIndex(
                        (data) => data.lineNumber === l
                    );
                    if (dataIndex !== -1) {
                        pageLineNum = dataIndex + 1;
                    }
                    const pNum = Math.ceil(pageLineNum / this.linesPerPage);
                    if (this.LineNumMap.has(pNum)) {
                        this.LineNumMap.get(pNum).push({
                            logLineNum: l,
                            pageLineNum: pageLineNum
                        });
                    } else {
                        this.LineNumMap.set(pNum, [
                            {
                                logLineNum: l,
                                pageLineNum: pageLineNum
                            }
                        ]);
                    }
                }
            });
        }
        // console.log('Map: ', this.LineNumMap);
    }

    processNoSearchRes() {
        this.LineNumFocus = null;
        if (this.LineNumMap.size > 0) {
            if (this.LineNumMap.has(this.pageNumber)) {
                const highEle = this.LineNumMap.get(this.pageNumber);
                highEle.forEach(({ logLineNum, pageLineNum }) => {
                    const element = this.template.querySelector(
                        `[data-logid="${logLineNum}"]`
                    );
                    if (element) {
                        element.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                    }
                });
            }
        }
        this.LineNumMap = new Map();
    }

    goToMatch(event) {
        const lineNumber = event.detail;
        let pageLineNum = 0;
        // console.log('lineNumber: ', lineNumber);
        const dataIndex = this.dataInUse.findIndex(
            (data) => data.lineNumber === lineNumber
        );
        if (dataIndex !== -1) {
            pageLineNum = dataIndex + 1;
        }
        // console.log(
        //     'this.dataInUse: ',
        //     this.dataInUse,
        //     'linenumber: ',
        //     pageLineNum
        // );
        this.goToPage(pageLineNum);
    }

    goToPage(lineNumber) {
        //calculate the pagenumber
        if (this.linesPerPage <= 0 || lineNumber <= 0) return;
        this.LineNumFocus = lineNumber;
        this.pageNumber = Math.ceil(lineNumber / this.linesPerPage);
        this.calculations();
    }

    //################################# SEARCH FUNCTIONALITY END ##############################
    openUnitView(event) {
        // console.log('from logviewer', event.detail);
        this.isUnitView = true;
        const duration = event.detail.duration;
        const name = event.detail.name;
        const [startTimeStr, endTimeStr] = duration
            .split('-')
            .map((str) => str.trim());

        // Convert string timestamps to numbers
        const startTime = parseInt(startTimeStr, 10);
        const endTime = parseInt(endTimeStr, 10);

        this.unitViewBoundaries.startTime = startTime;
        this.unitViewBoundaries.endTime = endTime;

        if (isNaN(startTime) || isNaN(endTime)) {
            console.warn(
                'Invalid unitDuration format uniqueId and duration not generated',
                event.detail
            );
            return;
        }
        this.lvTitle = name;
        this.lvTitleHead = 'Now Showing';
        this.dataInUse = this.fileData.slice(startTime - 1, endTime);
        if (this.activeFilters.length > 0) {
            this.dataInUse = filterData(this.activeFilters, this.dataInUse);
        }
        this.refreshPages();
    }

    resetViewer() {
        this.dataInUse = this.fileData;
        this.isUnitView = false;
        this.unitViewBoundaries.startTime = 0;
        this.unitViewBoundaries.endTime = 0;
        this.refreshPages();
        this.isFilterEditing = false;
        this.handlePopoverClose();
        this.activeFilters = [];
        this.previousFilters = [];
        this.lvTitle = this.fileMetadata.fileName;
        this.lvTitleHead = 'Log Viewer';
    }
    handleCallStackChange() {
        this.callStackToggle = !this.callStackToggle;
    }
    closeCallStack() {
        this.callStackToggle = false;
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
        // console.log('button', button);
        const rect = button.getBoundingClientRect();
        // console.log('horizontal', horizontal);
        this.errorCenterX = (rect.left + rect.right) / 2 - 24;
        // console.log('centerX', this.errorCenterX);
    }

    closeErrorPopover() {
        this.errorPopoverOpen = false;
    }

    getWidgetPadding() {
        const element = this.template.querySelector('.widget');
        const rect = element.getBoundingClientRect();
        // console.log('rect', rect);
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

    get hasErrors() {
        return this.errors.length > 0;
    }
    goToErrLine(event) {
        this.goToPage(event.detail);
    }
}
