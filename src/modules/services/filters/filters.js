export default function filterData(filters, fileData) {
    //condtion check for active filters
    const activeFilters = filters.filter((filter) => filter.isActive);
    //     console.log('filters: ', activeFilters, 'fileData: ', fileData);
    return fileData.filter((record) => {
        return activeFilters.every(
            ({ field, operator, value, filterValues }) => {
                const fieldValue = record[field];
                switch (operator) {
                    case 'equals':
                        if (
                            Array.isArray(filterValues) &&
                            filterValues.length > 0
                        ) {
                            return value.includes(fieldValue);
                        } else {
                            return fieldValue === value;
                        }
                    case 'notEqualTo':
                        if (
                            Array.isArray(filterValues) &&
                            filterValues.length > 0
                        ) {
                            return !value.includes(fieldValue);
                        } else {
                            return fieldValue !== value;
                        }
                    case 'contains':
                        return fieldValue.includes(value);
                    default:
                        return true;
                }
            }
        );
    });
}
