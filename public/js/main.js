'use strict';
(function ($, win, doc) {

    $(function () {
        setRAFpoly();
        initScrollHandler();
        // runStars();
    });

    function initScrollHandler() {
        var body = $('body');
        $('a[href]')
            .filter(function () {
                return this.href.match(/#\w+/);
            })
            .click(function (event) {
                event.preventDefault();
                var dest = 0;
                if ($(this.hash).offset().top > $(doc).height() - $(win).height()) {
                    dest = $(doc).height() - $(win).height() - 50;
                } else {
                    dest = $(this.hash).offset().top - 50;
                }

                scroll(body, dest, 1400);
            });
    }

    function now() {
        return typeof Date.now === 'function' ? Date.now() : +new Date();
    }

    function smoothStep(start, end, point) {
        if (point <= start) { return 0; }
        if (point >= end) { return 1; }
        var x = (point - start) / (end - start); // interpolation
        return x * x * (3 - 2 * x);
    }

    function scroll(elm, to, time) {
        var prevTop = elm.scrollTop();
        var startTop = prevTop;
        var dist = to - startTop;
        var start = now();
        var end = start + time;

        function animateStep() {
            if (prevTop !== elm.scrollTop()) {
                return endScroll(); // interrupted
            }
            var nowTime = now();
            var newPos = Math.round(startTop + dist * smoothStep(start, end, nowTime));

            elm.scrollTop(newPos);

            if (nowTime >= end) {
                return endScroll();
            }
            var newTop = elm.scrollTop();
            if (newTop === prevTop && newTop !== newPos) {
                return endScroll();
            }
            prevTop = newTop;

            win.requestAnimationFrame(animateStep);
        }
        win.requestAnimationFrame(animateStep);

        function endScroll() { }
    }

    function setRAFpoly() {
        var lastTime = 0,
            vendors = ['ms', 'moz', 'webkit', 'o'],
            x;

        for (x = 0; x < vendors.length && !win.requestAnimationFrame; ++x) {
            win.requestAnimationFrame = win[vendors[x] + 'RequestAnimationFrame'];
            win.cancelAnimationFrame = win[vendors[x] + 'CancelAnimationFrame'] ||
                win[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!win.requestAnimationFrame) {
            win.requestAnimationFrame = function (callback, element) {
                var currTime = new Date().getTime(),
                    timeToCall = Math.max(0, 16 - (currTime - lastTime)),
                    id = win.setTimeout(function () {
                        callback(currTime + timeToCall);
                    }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
        }

        if (!win.cancelAnimationFrame) {
            win.cancelAnimationFrame = function (id) {
                win.clearTimeout(id);
            };
        }
    }

    /* Stars */
    function Star(size) {
        this.size = size;
        this.x = 0;
        this.y = 0;
        this.opacity = 1;
        this.elm = $('<div class="star">&#9728;</div>');
    }
    Star.prototype.brightness = function(val, doRender) {
        if (val) {
            this.opacity = val;
            if (doRender === true) {
                this.render();
            }
        } else {
            return this.opacity;
        }
    };
    Star.prototype.setXY = function(pos, doRender) {
        this.x = pos.x;
        this.y = pos.y;
        if (doRender === true) {
            this.render();
        }
    };
    Star.prototype.getXY = function() {
        return {
            x: this.x,
            y: this.y
        };
    };
    Star.prototype.render = function() {
        this.elm.css({
            fontSize: this.size + 'px',
            opacity: this.opacity,
            left: this.x + 'px',
            top: this.y + 'px'
        });
    };
    Star.prototype.removeIt = function() {
        this.elm.remove();
        delete this.elm;
    };
    Star.prototype.attach = function(to) {
        $(to).append(this.elm);
        this.render();
    };

    function rnd(max, min) {
        min = min || 0;
        return min + Math.round(Math.random() * (max-min));
    }
    function runStars() {
        var STARS_COUNT = 1500;
        var stars = [];
        var body = $('body');
        var maxW = body.width(),
            maxH = body.height();

        for (var i = STARS_COUNT; i > 0; i--) {
            stars.push(makeNewStar());
        }

        setTimeout(replaceOneStar, 100);

        function makeNewStar() {
            var star = new Star(rnd(6, 1));
            star.setXY({
                x: rnd(maxW),
                y: rnd(maxH)
            });
            star.brightness(1/rnd(3,1));
            star.attach(body);
            return star;
        }

        function replaceOneStar() {
            var oldstar = stars.shift();
            oldstar.removeIt();
            stars.push(makeNewStar());
            setTimeout(replaceOneStar, 100);
        }
    }

})($, window, document);
