/* global phantom, console */
'use strict';

var system = require('system');
if (system.args.length < 3) {
    console.error('I need more arguments: render-image [template] [outputFilename]');
    phantom.exit(1);
}

var page = require('webpage').create();

var template = system.args[1];
var fileName = system.args[2];

page.viewportSize = {
    width: 1024,
    height: 768
};

page.open(template);

page.onLoadFinished = renderImage;
page.onCallback = renderImage;

var cbCount = 0;
function renderImage(data) {
    cbCount++;
    if (cbCount >= 2) {
        page.render(fileName);
        console.log('Image generated');
        phantom.exit();
    }
}