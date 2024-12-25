import { api, LightningElement, track } from 'lwc';
import { parseResultToTree } from 'parser/callTree';

export default class UtilityPanel extends LightningElement {
    @api panelToggle = false;
    isLoaded = false;

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
        }
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

    handleResize(event) {
        console.log('resize', event.target);
    }
}
