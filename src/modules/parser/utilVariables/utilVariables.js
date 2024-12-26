export let eventsRegexMain = new Map();

//CODE_UNIT_STARTED
eventsRegexMain.set(
    'CODE_UNIT_STARTED',
    new Map([
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_STARTED\\|)[(\\[EXTERNAL\\])(0-9)]+(\\|apex:\\/\\/).+(\\/ACTION\\$).+'
            ),
            'Class-Action'
        ],
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_STARTED\\|)[(\\[EXTERNAL\\])(0-9)]+(\\|)[A-Za-z0-9]+(\\|).+(\\.).+(\\([A-Za-z]+\\))'
            ),
            'Class-Method'
        ],
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_STARTED\\|)[(0-9)(\\[EXTERNAL\\])]+(\\|TRIGGERS)'
            ),
            'Trigger-Simple'
        ],
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_STARTED\\|)[(0-9)(\\[EXTERNAL\\])]+(\\|)\\w+(\\|)[\\w.]+\\s(on)\\s(\\w)+\\s(trigger\\sevent\\s)\\w+(\\|__sfdc_trigger\\/)[\\w\\/]+'
            ),
            'Trigger-Detailed'
        ],
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_STARTED\\|)[(0-9)(\\[EXTERNAL\\])]+(\\|)\\w+;\\w+;\\w+(\\|)[\\w\\.]+'
            ),
            'Trigger-Event'
        ],
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_STARTED\\|)[(\\[EXTERNAL\\])(0-9)]+(\\|Validation)\\:[\\w]+\\:[\\w\\d]+'
            ),
            'Validation-Generic'
        ],
        [
            new RegExp(
                '^[0-9:.\\s\\(\\)]+(\\|)(CODE_UNIT_STARTED)(\\|)(\\[EXTERNAL\\])(\\|)Flow:[a-zA-Z_]+'
            ),
            'Flow-Generic'
        ],
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_STARTED\\|)[(0-9)(\\[EXTERNAL\\])]+(\\|)[\\w.]+'
            ),
            'Class-Simple'
        ]
    ])
);

//CODE_UNIT_FINISHED
eventsRegexMain.set(
    'CODE_UNIT_FINISHED',
    new Map([
        [
            new RegExp('^[0-9:.]+\\s\\([0-9]+\\)\\|(CODE_UNIT_FINISHED\\|).+'),
            'Finished-Generic'
        ]
    ])
);

eventsRegexMain.set(
    'METHOD_ENTRY',
    new Map([
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(METHOD_ENTRY\\|)[\\[0-9\\]]+(\\|)[\\w]+(\\|).+'
            ),
            'Method-Generic'
        ],
        [
            new RegExp(
                '^[0-9:.]+\\s\\([0-9]+\\)\\|(METHOD_ENTRY\\|)[\\[0-9\\]]+(\\|\\|).+'
            ),
            'Method-System'
        ]
    ])
);

export let timeStampRegex = new RegExp(
    '(\\d{2}:\\d{2}:\\d{2})\\.(\\d+)\\s\\((\\d+)\\)'
);
