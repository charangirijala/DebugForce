import { LightningElement } from 'lwc';
import { eventsRegexMain } from 'parser/utilVariables';

import { publish } from 'services/pubsub';
// import { publish, MessageContext } from 'lightning/messageService';

// import STATE from '@salesforce/messageChannel/App_Service__c';
/*
 * treeNodes Schema:
 * {
 *     "Id":58645,
 *     "name":"execute_anonymous_apex",
 *     "type":"Class",
 *     "hasError":false,
 *     "hasChild":true,
 *     "isExpanded":true,
 *     "isSelected":true,
 *     "level":1,
 *     "posinset":1,
 *     "setsize":100,
 *     "classComb":"slds-hint-parent",
 *     "parents":"|"
 *  }
 */

/**
 * FILE DATA PARTIAL Schema:
 * {
      line: line,
      event: event,
      lineNumber: lineNumber
    };
 */

/**
 * FILE METADATA Schema
 * {
 *   "fileName": "",
 *   "nofLines": "",
 *   "nofEvents": "",
 *   "nofCodeUnits": "",
 *   "nofMethodUnits": "",
 * }
 */

/**
 * CODE UNIT Schema:
  {
   "Id":0,
   "childUnitsandLines":[
      "CodeUnit"
   ],
   "cuName":"ClientInputHandler",
   "cuNamespace":"undefined",
   "cuType":"Class",
   "hasError":"undefined",
   "isTrigger":false,
   "methodRunning":"ACTION$callApexFromClient",
   "triggerEvent":"undefined",
   "triggerObject":"undefined",
   "unitDuration":"3 - 643"
}
 */
export default class LogFileProcessor extends LightningElement {
    STD_EXP_MATCHER = new RegExp('^[0-9:.]*\\s\\([0-9]*\\)(|)[A-Z_]*.*');
    EXE_ANONYMOUS_MATCHER = new RegExp('^(Execute\\sAnonymous:\\s).*');
    result = [];
    isCurUnitCU = true;
    codeUnitsStack = [];
    methodUnitsStack = [];
    stdExpCount = 0;
    codeUnitsCount = 0;
    methodUnitsCount = 0;
    eventsPicklistValues = new Set();
    execAnonyCount = 0;
    fileData;
    fileMetadata = {
        fileName: '',
        nofLines: 0,
        nofCodeUnits: 0,
        nofMethodUnits: 0
    };
    fileDataPartial = [];
    // treeNodes = [];
    level = 1;
    posinset = 1;
    maxsize = 100;
    //     @wire(MessageContext)
    //     messageContext;
    get acceptedFormats() {
        return ['.log', '.txt'];
    }
    handleFileUpload(event) {
        var reader = new FileReader();
        console.log('[fileUploader.js] Processing Uploaded file...');
        const rawFile = event.target.files[0];
        this.fileMetadata.fileName = rawFile.name;
        console.log('[fileUploader.js] File Size: ', rawFile.size);
        reader.onload = (e) => {
            const file = e.target.result;
            // console.log(file);
            // console.log(file);
            this.fileData = file.split(/\r\n|\n/);

            console.log(
                '[fileUploader.js] No.of Lines: ',
                this.fileData.length
            );
            // lines.forEach((line) => {
            //   console.log("Single Line: ", line);
            // });
            this.processLogData();
        };
        reader.onerror = (e) => {
            console.log('[fileUploader.js] Oops!!..Error Loading File..', e);
        };
        reader.readAsText(rawFile);
    }
    processLogData() {
        this.fileData.forEach((line, idx) => {
            if (this.STD_EXP_MATCHER.test(line)) {
                this.stdExpCount++;
                const lineEvent = line.split('|')[1];
                this.eventsPicklistValues.add(lineEvent);
                /*
                 * If the current line is only codeunit or Methodunit then
                 * process regex else directly push the line to corresponding * CU / MU
                 */
                if (lineEvent === 'CODE_UNIT_STARTED') {
                    const RegexMap = eventsRegexMain.get(lineEvent);
                    for (let [key, value] of RegexMap) {
                        if (key.test(line)) {
                            console.log(
                                value,
                                '=>',
                                key.test(line),
                                '=>',
                                line
                            );
                            this.createCodeUnit(line, value, idx);
                            break;
                        }
                    }
                } else if (lineEvent === 'CODE_UNIT_FINISHED') {
                    //process codeunit finish logic
                    this.exitCodeUnit(idx);
                } else if (lineEvent === 'METHOD_ENTRY') {
                    const RegexMap = eventsRegexMain.get(lineEvent);
                    for (let [key, value] of RegexMap) {
                        if (key.test(line)) {
                            // console.log(value, "=>", key.test(line), "=>", line);
                            this.createMethodUnit(line, value, idx);
                            break;
                        }
                    }
                } else if (lineEvent === 'METHOD_EXIT') {
                    //process methodunit finish logic
                    this.exitMethodUnit(idx);
                } else {
                    this.addLinetoCUorMU(line, lineEvent, idx);
                }

                this.addToFileDataPartial(line, lineEvent, idx + 1);
            } else if (this.EXE_ANONYMOUS_MATCHER.test(line)) {
                this.execAnonyCount++;
                this.addToFileDataPartial(line, 'EXECUTE_ANONYMOUS', idx + 1);
            } else {
                // console.log("[fileUploader.js] Skipping line: ", line);
                this.addToFileDataPartial(line, 'ORPHAN', idx + 1);
            }
        });

        //publish fileData to MessageChannel
        this.publishFileMetadata();
        // parseResultToTree(this.result);
        console.log('Total stdExps: ', this.stdExpCount);
        console.log('Total exeAnonys: ', this.execAnonyCount);
        console.log('Total CodeUnits Count: ', this.codeUnitsCount);
        console.log('Total MethodUnits Count: ', this.methodUnitsCount);
        console.log('Final Result after processing res: ', this.result);
        console.log('codeUnitsStack count: ', this.codeUnitsStack.length);
        console.log('methodUnitsStack count: ', this.methodUnitsStack.length);
        // console.log('treeNodes: ', this.treeNodes);
    }

    /*
     * Handles the logic of new CodeUnit creation
     * Extracts the details of CU
     */
    createCodeUnit(line, type, index) {
        let enteredCondition = false;
        console.log('Type: ', type);
        let cu = {};
        cu.unitDuration = index;
        if (type === 'Class-Action') {
            enteredCondition = true;
            const splitArr = line.split('|');
            const neededLine = splitArr[splitArr.length - 1];
            const splitArr1 = neededLine.split('/');
            cu.cuName = splitArr1[splitArr1.length - 2];
            cu.cuType = 'Class';

            cu.methodRunning = splitArr1[splitArr1.length - 1];
            cu.isTrigger = false;
        } else if (type === 'Class-Method') {
            enteredCondition = true;
            cu.cuType = 'Class';
            cu.isTrigger = false;
            const splitArr = line.split('|');
            const neededLine = splitArr[splitArr.length - 1];
            // cu.classId = splitArr[splitArr.length - 2];
            const splitArr1 = neededLine.split('.');
            if (splitArr1.length === 3) {
                cu.cuName = splitArr1[1];
                cu.cuNamespace = splitArr1[0];
                cu.methodRunning = splitArr1[2];
            } else if (splitArr1.length === 2) {
                cu.cuName = splitArr1[0];
                cu.methodRunning = splitArr1[1];
            }
        } else if (type === 'Class-Simple') {
            const splitArr = line.split('|');
            const neededLine = splitArr[splitArr.length - 1];
            if (neededLine !== 'TRIGGERS') {
                enteredCondition = true;
                cu.cuType = 'Class';
                cu.isTrigger = false;
                cu.cuName = neededLine;
            }
        } else if (type === 'Trigger-Detailed') {
            enteredCondition = true;
            cu.cuType = 'Trigger';
            cu.isTrigger = true;
            const splitArr = line.split('|');
            const neededLine = splitArr[splitArr.length - 1];
            const neededLine0 = splitArr[splitArr.length - 2];
            const splitArr0 = neededLine0.split(' ');
            // console.log(splitArr0);
            cu.triggerEvent = splitArr0[5];
            cu.triggerObject = splitArr0[2];
            const splitArr1 = neededLine.split('/');
            if (splitArr1.length === 3) {
                cu.cuNamespace = splitArr1[1];
                cu.cuName = splitArr1[2];
            } else if (splitArr1.length === 2) {
                cu.cuName = splitArr1[1];
            }
        } else if (type === 'Trigger-Event') {
            enteredCondition = true;
            cu.cuType = 'Trigger';
            cu.isTrigger = true;
            const splitArr = line.split('|');
            const neededLine0 = splitArr[splitArr.length - 2];
            const neededLine = splitArr[splitArr.length - 1];
            const splitArr0 = neededLine0.split(';');
            cu.triggerEvent = splitArr0[0];
            cu.triggerObject = splitArr0[1];
            const splitArr1 = neededLine.split('.');
            if (splitArr1.length === 1) {
                cu.cuName = splitArr1[0];
            } else if (splitArr1.length === 2) {
                cu.cuNamespace = splitArr1[0];
                cu.cuName = splitArr1[1];
            }
        } else if (type === 'Validation-Generic') {
            enteredCondition = true;
            cu.cuType = 'Validation';
            cu.isTrigger = false;
            const splitArr = line.split(':');
            let name = 'Validation on ';
            name += splitArr[splitArr.length - 2];
            cu.cuName = name;
        } else if (type === 'Flow-Generic') {
            enteredCondition = true;
            cu.cuType = 'Flow';
            cu.isTrigger = false;
            const splitArr = line.split(':');
            let name = 'Flow on ';
            name += splitArr[splitArr.length - 1];
            cu.cuName = name;
        }
        if (enteredCondition) {
            this.isCurUnitCU = true;
            cu.Id = this.codeUnitsCount++;

            this.addCUtoResult(cu);
            this.codeUnitsStack.push(cu);
        }
    }

    /*
     * get the current CU and update the lineDuration
     * Update the currentCUIndex and isCurUnitCU
     */
    exitCodeUnit(idx) {
        let CodeUnit = this.currentCU();
        CodeUnit.unitDuration += ' - ' + idx;
        this.codeUnitsStack.pop();
    }

    createMethodUnit(line, type, index) {
        /*
         * 1. write logic according to the pattern
         * 2. If Method generic then get all the data like methodName,methodTitle etc
         */
        let methodUnit = {};
        methodUnit.unitDuration = index;
        if (type === 'Method-Generic') {
            this.isCurUnitCU = false;
            this.methodUnitsCount++;
            // methodUnit.Id = this.methodUnitsCount++;
            methodUnit.type = 'Method';
            const splitArr = line.split('|');
            methodUnit.methodTitle = splitArr[splitArr.length - 1];
            //changed for correct method unit name
            let s2 =
                '(' +
                methodUnit.methodTitle.substring(
                    methodUnit.methodTitle.lastIndexOf('(') + 1
                );
            methodUnit.methodName =
                methodUnit.methodTitle
                    .replace(s2, '')
                    .substring(methodUnit.methodTitle.lastIndexOf('.') + 1) +
                s2;
            //Once methodUnit fields are filled push it to methodUnitsStack
            this.addMUtoResult(methodUnit);
            this.methodUnitsStack.push(methodUnit);
        } else if (type === 'Method-System') {
            this.isCurUnitCU = false;
            // methodUnit.Id = this.methodUnitsCount++;
            methodUnit.methodTitle = 'System Method';
            methodUnit.type = 'System Method';
            methodUnit.methodName = line.substring(line.lastIndexOf('|') + 1);
            this.addMUtoResult(methodUnit);
            this.methodUnitsStack.push(methodUnit);
        }
    }

    exitMethodUnit(index) {
        let methodUnit = this.currentMU();
        methodUnit.unitDuration += ' - ' + index;
        this.methodUnitsStack.pop();
    }

    currentMU() {
        if (this.methodUnitsStack.length === 0) return null;
        return this.methodUnitsStack[this.methodUnitsStack.length - 1];
    }

    currentCU() {
        if (this.codeUnitsStack.length === 0) return null;
        return this.codeUnitsStack[this.codeUnitsStack.length - 1];
    }

    addMUtoResult(methodUnit) {
        //check if methodUnitsStack is empty
        if (this.methodUnitsStack.length !== 0) {
            let MUTop = this.currentMU();
            if (MUTop.childUnitsandLines) {
                MUTop.childUnitsandLines.push(methodUnit);
            } else {
                MUTop.childUnitsandLines = [];
                MUTop.childUnitsandLines.push(methodUnit);
            }
        } else if (this.codeUnitsStack.length !== 0) {
            let CUTop = this.currentCU();
            if (CUTop.childUnitsandLines) {
                CUTop.childUnitsandLines.push(methodUnit);
            } else {
                CUTop.childUnitsandLines = [];
                CUTop.childUnitsandLines.push(methodUnit);
            }
        }
    }

    addCUtoResult(codeUnit) {
        if (this.codeUnitsStack.length !== 0) {
            console.log('Entered length condition');
            let CUTop = this.currentCU();
            console.log(CUTop.childUnitsandLines);
            if (
                CUTop.childUnitsandLines === null ||
                CUTop.childUnitsandLines === undefined
            ) {
                CUTop.childUnitsandLines = [];
                CUTop.childUnitsandLines.push(codeUnit);
                this.level++;
                this.posinset = 1;
                // this.treeNodes.push(this.createNode(codeUnit));
            } else {
                CUTop.childUnitsandLines.push(codeUnit);
                // this.treeNodes.push(this.createNode(codeUnit));
            }
        } else {
            console.log('Entered direct push condition');
            this.result.push(codeUnit);
            // this.treeNodes.push(this.createNode(codeUnit));
        }
    }

    addLinetoCUorMU(line, event, idx) {
        let lineDetails = { line: line, event: event, lineNumber: idx };
        this.addMUtoResult(lineDetails);
    }

    createNode(codeUnit) {
        let Node = {
            id: codeUnit.Id,
            name: codeUnit.cuName,
            type: codeUnit.cuType,
            hasError: codeUnit.hasError,
            hasChild: false,
            isExpanded: false,
            isSelected: false,
            level: this.level,
            posinset: this.posinset,
            maxsize: this.maxsize
        };
        this.posinset++;
        return Node;
    }

    addToFileDataPartial(line, event, lineNumber) {
        const temp = {
            line: line,
            event: event,
            lineNumber: lineNumber
        };
        this.fileDataPartial.push(temp);
    }

    publishFileMetadata() {
        this.fileMetadata.nofCodeUnits = this.codeUnitsCount;
        this.fileMetadata.nofMethodUnits = this.methodUnitsCount;
        this.fileMetadata.nofLines = this.fileData.length;
        // console.log("Event Picklist Values: ", this.eventsPicklistValues);
        const payload = {
            fileMetadata: this.fileMetadata,
            fileData: this.fileDataPartial,
            result: this.result,
            eventsPicklistValues: Array.from(this.eventsPicklistValues)
        };
        publish('logChannel', payload);
    }
}
