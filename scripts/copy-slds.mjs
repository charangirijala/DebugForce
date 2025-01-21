import fs from 'fs';
fs.cp(
    './node_modules/@salesforce-ux/design-system/assets/',
    './src/assets',
    { recursive: true },
    () => {
        console.log('Done copying SLDS resources');
    }
);

fs.cp('./src/styles/styles.css', './src/assets', { recursive: true }, () => {
    console.log('Done copying styles.css');
});
