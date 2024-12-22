import { LightningElement, api } from 'lwc';
// import { subscribe } from 'services/pubsub';

export default class Search extends LightningElement {
    onRes = 0;
    totRes = 0;
    nextDisabled = false;
    prevDisabled = true;
    matchedLines = [];
    @api logtobeFiltered = [];

    connectedCallback() {
        //    subscribe('searchChannel', (data) => {
        //        this.logtobeFiltered = data;
        //        console.log('connectedCallback', this.logtobeFiltered);
        //    });
    }
    closeSearch() {
        this.dispatchEvent(new CustomEvent('closesearch'));
    }
    handleSearchInput(event) {
        clearTimeout(this.timeoutId);
        const input = event.target.value;
        this.timeoutId = setTimeout(() => {
            this.searchLog(input);
        }, 500);
        console.log('input: ', event.target.value);
    }

    gotoNext() {
        if (this.onRes < this.totRes) {
            this.dispatchEvent(
                new CustomEvent('nextmatch', {
                    detail: this.matchedLines[this.onRes++]
                })
            );
        }

        this.nextDisabled = this.onRes === this.totRes ? true : false;
        this.prevDisabled = this.onRes === 0 ? true : false;
    }

    goBack() {
        if (this.onRes > 0) {
            this.dispatchEvent(
                new CustomEvent('prevmatch', {
                    detail: this.matchedLines[this.onRes--]
                })
            );
        }
        this.nextDisabled = this.onRes === this.totRes ? true : false;
        this.prevDisabled = this.onRes === 0 ? true : false;
    }

    searchLog(searchTerm) {
        if (this.logtobeFiltered.length === 0) {
            this.onRes = this.totRes = 0;
            return;
        }
        if (searchTerm.length !== 0 && searchTerm !== undefined) {
            const results = this.logtobeFiltered.filter((log) =>
                log.line.includes(searchTerm)
            );

            if (results.length > 0) {
                //  console.log('Found logs:', results);
                this.matchedLines = results.map((log) => log.lineNumber);
                this.totRes = this.matchedLines.length;

                this.dispatchEvent(
                    new CustomEvent('nextmatch', {
                        detail: this.matchedLines[this.onRes++]
                    })
                );
                //  console.log('Line numbers:', lineNumbers);
            } else if (results.length === 0) {
                this.onRes = 0;
                this.totRes = 0;
            }
        } else {
            this.onRes = 0;
            this.totRes = 0;
        }
    }
}
