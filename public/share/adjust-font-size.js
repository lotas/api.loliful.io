/* global document, console, window */

document.addEventListener('DOMContentLoaded', adjustFontSize);

function adjustFontSize() {
    var container = document.getElementById('container');
    var text = document.getElementById('text');

    var delta = 15;
    var paddings = 60;
    var targetHeight = container.clientHeight - paddings;

    var minFontSize = 8;
    var maxFontSize = 75;
    var fontSizeFactor = 1.3;

    setFontSize(text, minFontSize, fontSizeFactor);
    while (minFontSize <= maxFontSize && targetHeight - text.clientHeight > delta) {
        minFontSize++;
        setFontSize(text, minFontSize, fontSizeFactor);
    }
    if (text.clientHeight > targetHeight) {
        minFontSize--;
        setFontSize(text, minFontSize, fontSizeFactor);
    }

    // notify we are ready for screenshot
    if (typeof window.callPhantom === 'function') {
        window.callPhantom('adjusted');
    }
}

function setFontSize(elm, size, lineHeightFactor) {
    elm.style['font-size'] = Math.floor(size) + 'px';
    elm.style['line-height'] = Math.ceil(size * lineHeightFactor) + 'px';
    elm.style['margin-top'] = - Math.floor(elm.clientHeight / 2) + 'px';
}
