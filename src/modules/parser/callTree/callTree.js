/** RESULT Schema
 * {
  "type": "array",
  "items": {
    "type": "object",
    "required": [],
    "properties": {
      "unitDuration": {
        "type": "string"
      },
      "cuType": {
        "type": "string"
      },
      "isTrigger": {
        "type": "string"
      },
      "cuName": {
        "type": "string"
      },
      "Id": {
        "type": "string"
      },
      "childUnitsandLines": {
        "type": "array",
        "items": {
          "type": "object",
          "required": [],
          "properties": {
            "line": {
              "type": "string"
            },
            "event": {
              "type": "string"
            },
            "lineNumber": {
              "type": "number"
            }
          }
        }
      }
    }
  }
} **/

export function parseResultToTree(result) {
    // Usage example:
    const units = parseDebugLogUnits(result, [], 1, null);
    let posMap = new Map();
    if (units.length > 0) {
        units.forEach((unit) => {
            if (posMap.has(unit.level)) {
                let pos = posMap.get(unit.level);
                unit.posinset = pos;
                posMap.set(unit.level, pos + 1);
            } else {
                unit.posinset = 1;
                posMap.set(unit.level, 2);
            }

            if (unit.hasChild) {
                unit.isExpanded = false;
            }
        });
    }
    setMaxPos(units, posMap);
    // posMap.forEach((value, key) => {
    //     console.log(`Level: ${key}, Position: ${value}`);
    // });
    // console.log('units', units);
    return units;
}

const setMaxPos = (units, posMap) => {
    units.forEach((unit) => {
        let maxPos = posMap.get(unit.level) - 1;
        unit.maxsize = maxPos;
    });
};

const hasChildUnits = (value) => {
    return (
        Array.isArray(value) &&
        value.some(
            (item) =>
                item.cuType || (item.type && item.type !== 'System Method')
        )
    );
};

function calculateDuration(timeRangeStr) {
    // Remove any extra whitespace and split by hyphen
    const [startTimeStr, endTimeStr] = timeRangeStr
        .split('-')
        .map((str) => str.trim());

    // Convert string timestamps to numbers
    const startTime = parseInt(startTimeStr, 10);
    const endTime = parseInt(endTimeStr, 10);

    if (isNaN(startTime) || isNaN(endTime)) {
        throw new Error(
            'Invalid unitDuration format uniqueId and duration not generated'
        );
    }

    const duration = endTime - startTime;
    const uniqueId = `${startTime}${Math.random().toString(36).substring(2, 6)}${endTime}`;

    return {
        duration,
        uniqueId
    };
}

function parseDebugLogUnits(obj, units = [], level = 1, parentId) {
    // Base case - if obj is null or not an object
    if (
        !obj ||
        typeof obj !== 'object' ||
        obj.type === 'System Method' ||
        obj.line
    ) {
        return units;
    }
    let currId = parentId;
    // Check if current object has 'event' and 'line' properties
    if (obj.cuType) {
        // Extract code unit information
        let duration = 0;
        let uniqueId = null;
        try {
            ({ duration, uniqueId } = calculateDuration(obj.unitDuration));
        } catch (e) {
            uniqueId = Math.random().toString(36).substring(2, 6);
            console.error(e);
        }
        const unit = {
            id: uniqueId,
            parentId: parentId,
            type: obj.cuType,
            name: obj.cuName,
            level: level,
            unitDuration: obj.unitDuration,
            unitLength: duration,
            hasChild: Object.values(obj).some(hasChildUnits)
        };
        currId = uniqueId;
        units.push(unit);
    }

    if (obj.type && obj.type !== 'System Method') {
        // Extract method unit information and exclude System Methods
        // Extract code unit information
        let duration = 0;
        let uniqueId = null;
        try {
            ({ duration, uniqueId } = calculateDuration(obj.unitDuration));
        } catch (e) {
            uniqueId = Math.random().toString(36).substring(2, 6);
            console.error(e);
        }
        const unit = {
            id: uniqueId,
            parentId: parentId,
            name: obj.methodTitle,
            type: obj.type,
            level: level,
            unitDuration: obj.unitDuration,
            unitLength: duration,
            hasChild: Object.values(obj).some(hasChildUnits)
        };
        currId = uniqueId;
        units.push(unit);
    }

    //Recursively process arrays
    if (Array.isArray(obj)) {
        obj.forEach((item) => parseDebugLogUnits(item, units, level, currId));
    }
    // Recursively process object properties
    else {
        Object.values(obj).forEach((value) => {
            if (Array.isArray(value)) {
                value.forEach((element) => {
                    if (
                        element.cuType ||
                        (element.type && element.type !== 'System Method')
                    ) {
                        parseDebugLogUnits(element, units, level + 1, currId);
                    }
                });
            }
        });
    }

    return units;
}
