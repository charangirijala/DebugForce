import { api, LightningElement, track } from 'lwc';
import { parseResultToTree } from 'parser/callTree';
import { subscribe } from 'services/pubsub';

export default class UtilityPanel extends LightningElement {
    @api panelToggle = false;
    isLoaded = false;
    appChannelSub = null;
    activeApp = 'Log Viewer';
    isWidthChanged = false;
    nameWidth;
    typeWidth;
    lineDurationWidth;
    SOQLcountWidth;
    DMLcountWidth;
    CPUtimeWidth;
    get isLogViewer() {
        return this.activeApp === 'Log Viewer';
    }

    connectedCallback() {
        if (!this.appChannelSub) {
            this.appChannelSub = subscribe('appChannel', (data) => {
                this.activeApp = data.activeApp;
            });
        }
    }
    renderedCallback() {
        if (this.isLoaded === false) {
            this.isLoaded = true;
            if (this.data) {
                console.log('data from utilitypanel', this.data);
                this.nodesMaster = parseResultToTree(this.data);
            }
            this.nowShowingNodes = this.nodesMaster.filter((node) => {
                return node.level === 1;
            });
        }
        this.setColWidths();
        console.log('renderedCallback from utilitypanel');
    }
    nodesMaster = [];
    @track nowShowingNodes;
    @api data;
    get classComb() {
        return this.panelToggle
            ? 'slds-utility-panel slds-grid utility-panel slds-grid_vertical slds-is-open'
            : 'slds-utility-panel slds-grid utility-panel slds-grid_vertical';
    }
    handleNodeToggle(event) {
        const nodeId = event.target.dataset.nodeid;
        const level = parseInt(event.target.dataset.nodelevel, 10);

        const nodeMap = new Map(
            this.nowShowingNodes.map((node) => [node.id, node])
        );
        const targetNode = nodeMap.get(nodeId);

        if (!targetNode) return;

        targetNode.isExpanded = !targetNode.isExpanded;

        if (targetNode.isExpanded) {
            this.expandNode(nodeId, level + 1, nodeMap);
        } else {
            this.collapseNode(nodeId, nodeMap);
            // Convert map back to array
            this.nowShowingNodes = Array.from(nodeMap.values());
            console.log('nowShowingNodes', this.nowShowingNodes);
        }
    }

    switchToUnitView(event) {
        const name = event.target.dataset.unitname;
        const duration = event.target.dataset.unitduration;
        console.log('Name: ', name, 'duration: ', duration);

        this.dispatchEvent(
            new CustomEvent('unitview', {
                detail: {
                    name: name,
                    duration: duration
                }
            })
        );
    }

    expandNode(parentId, level, nodeMap) {
        // Find the index of parent node in the current array
        const parentIndex = this.nowShowingNodes.findIndex(
            (node) => node.id === parentId
        );
        const childNodes = this.nodesMaster.filter(
            (node) => node.parentId === parentId && node.level === level
        );

        // Insert child nodes into the array right after parent
        this.nowShowingNodes.splice(parentIndex + 1, 0, ...childNodes);

        // Update the map with new nodes
        childNodes.forEach((node) => nodeMap.set(node.id, node));
    }

    collapseNode(nodeId, nodeMap) {
        const removeChildren = (id) => {
            const childNodes = Array.from(nodeMap.values()).filter(
                (node) => node.parentId === id
            );

            childNodes.forEach((child) => {
                child.isExpanded = false;
                nodeMap.delete(child.id);
                removeChildren(child.id);
            });
        };

        removeChildren(nodeId);
    }

    handleMinimizer() {
        this.dispatchEvent(new CustomEvent('closepanel'));
    }

    //FOR HANDLING THE HORIZONTAL SCROLL OF TABLE MANUALLY
    tableOuterDivScrolled(event) {
        this._tableViewInnerDiv =
            this.template.querySelector('.tableViewInnerDiv');
        if (this._tableViewInnerDiv) {
            if (
                !this._tableViewInnerDivOffsetWidth ||
                this._tableViewInnerDivOffsetWidth === 0
            ) {
                this._tableViewInnerDivOffsetWidth =
                    this._tableViewInnerDiv.offsetWidth;
            }
            this._tableViewInnerDiv.style =
                'width:' +
                (event.currentTarget.scrollLeft +
                    this._tableViewInnerDivOffsetWidth) +
                'px;' +
                this.tableBodyStyle;
        }
        this.tableScrolled(event);
    }

    tableScrolled(event) {
        if (this.enableInfiniteScrolling) {
            if (
                event.target.scrollTop + event.target.offsetHeight >=
                event.target.scrollHeight
            ) {
                this.dispatchEvent(
                    new CustomEvent('showmorerecords', {
                        bubbles: true
                    })
                );
            }
        }
        if (this.enableBatchLoading) {
            if (
                event.target.scrollTop + event.target.offsetHeight >=
                event.target.scrollHeight
            ) {
                this.dispatchEvent(
                    new CustomEvent('shownextbatch', {
                        bubbles: true
                    })
                );
            }
        }
    }

    //#region ***************** RESIZABLE COLUMNS *************************************/
    handlemouseup(e) {
        this._tableThColumn = undefined;
        this._tableThInnerDiv = undefined;
        this._pageX = undefined;
        this._tableThWidth = undefined;
    }

    handlemousedown(e) {
        if (!this._initWidths) {
            this._initWidths = [];
            let tableThs = this.template.querySelectorAll(
                'table thead .dv-dynamic-width'
            );
            tableThs.forEach((th) => {
                this._initWidths.push(th.style.width);
            });
        }

        this._tableThColumn = e.target.parentElement;
        this._tableThInnerDiv = e.target.parentElement;
        while (this._tableThColumn.tagName !== 'TH') {
            this._tableThColumn = this._tableThColumn.parentNode;
        }
        while (!this._tableThInnerDiv.className.includes('slds-cell-fixed')) {
            this._tableThInnerDiv = this._tableThInnerDiv.parentNode;
        }
        // console.log(
        //     'handlemousedown this._tableThColumn.tagName => ',
        //     this._tableThColumn.tagName
        // );
        this._pageX = e.pageX;

        this._padding = this.paddingDiff(this._tableThColumn);

        this._tableThWidth = this._tableThColumn.offsetWidth - this._padding;
        // console.log(
        //     'handlemousedown this._tableThColumn.tagName => ',
        //     this._tableThColumn.tagName
        // );
    }

    handlemousemove(e) {
        // console.log('mousemove this._tableThColumn => ', this._tableThColumn);
        if (this._tableThColumn && this._tableThColumn.tagName === 'TH') {
            this._diffX = e.pageX - this._pageX;

            this.template.querySelector('table').style.width =
                this.template.querySelector('table') - this._diffX + 'px';
            const newWidth = this._tableThWidth + this._diffX;
            this._tableThColumn.style.width = newWidth + 'px';
            this._tableThInnerDiv.style.width = this._tableThColumn.style.width;
            const colname = this._tableThColumn.dataset.colname;
            this.setColWidthsChange(colname, newWidth);
            let tableThs = this.template.querySelectorAll(
                'table thead .dv-dynamic-width'
            );
            let tableBodyRows =
                this.template.querySelectorAll('table tbody tr');
            let tableBodyTds = this.template.querySelectorAll(
                'table tbody .dv-dynamic-width'
            );
            tableBodyRows.forEach((row) => {
                let rowTds = row.querySelectorAll('.dv-dynamic-width');
                rowTds.forEach((td, ind) => {
                    rowTds[ind].style.width = tableThs[ind].style.width;
                });
            });
        }
    }

    handledblclickresizable() {
        let tableThs = this.template.querySelectorAll(
            'table thead .dv-dynamic-width'
        );
        let tableBodyRows = this.template.querySelectorAll('table tbody tr');
        tableThs.forEach((th, ind) => {
            th.style.width = this._initWidths[ind];
            th.querySelector('.slds-cell-fixed').style.width =
                this._initWidths[ind];
        });
        tableBodyRows.forEach((row) => {
            let rowTds = row.querySelectorAll('.dv-dynamic-width');
            rowTds.forEach((td, ind) => {
                rowTds[ind].style.width = this._initWidths[ind];
            });
        });
    }

    paddingDiff(col) {
        if (this.getStyleVal(col, 'box-sizing') === 'border-box') {
            return 0;
        }

        this._padLeft = this.getStyleVal(col, 'padding-left');
        this._padRight = this.getStyleVal(col, 'padding-right');
        return parseInt(this._padLeft, 10) + parseInt(this._padRight, 10);
    }

    getStyleVal(elm, css) {
        return window.getComputedStyle(elm, null).getPropertyValue(css);
    }

    setColWidths() {
        const utilitypanel = this.template.querySelector('.utility-panel');
        if (utilitypanel) {
            const panelWidth = utilitypanel.getBoundingClientRect().width;
            const namecol = this.template.querySelectorAll('.col-name');
            const typecol = this.template.querySelectorAll('.col-type');
            const lineDurationcol =
                this.template.querySelectorAll('.col-lineDuration');
            const SOQLcountcol =
                this.template.querySelectorAll('.col-SOQLcount');
            const DMLcountcol = this.template.querySelectorAll('.col-DMLcount');
            const CPUtimecol = this.template.querySelectorAll('.col-CPUtime');

            if (this.isWidthChanged === false) {
                this.nameWidth = panelWidth * 0.48;
                this.typeWidth = panelWidth * 0.1;
                this.lineDurationWidth = panelWidth * 0.1;
                this.SOQLcountWidth = panelWidth * 0.1;
                this.DMLcountWidth = panelWidth * 0.1;
                this.CPUtimeWidth = panelWidth * 0.1;
                this.isWidthChanged = true;
            }

            namecol.forEach((col) => {
                col.style.width = this.nameWidth + 'px';
            });

            typecol.forEach((col) => {
                col.style.width = this.typeWidth + 'px';
            });

            lineDurationcol.forEach((col) => {
                col.style.width = this.lineDurationWidth + 'px';
            });

            SOQLcountcol.forEach((col) => {
                col.style.width = this.SOQLcountWidth + 'px';
            });
            DMLcountcol.forEach((col) => {
                col.style.width = this.DMLcountWidth + 'px';
            });
            CPUtimecol.forEach((col) => {
                col.style.width = this.CPUtimeWidth + 'px';
            });
        }
    }

    setColWidthsChange(colname, width) {
        if (colname === 'name') {
            this.nameWidth = width;
        } else if (colname === 'type') {
            this.typeWidth = width;
        } else if (colname === 'lineDuration') {
            this.lineDurationWidth = width;
        } else if (colname === 'SOQLcount') {
            this.SOQLcountWidth = width;
        } else if (colname === 'DMLcount') {
            this.DMLcountWidth = width;
        } else if (colname === 'CPUtime') {
            this.CPUtimeWidth = width;
        }
    }
}
