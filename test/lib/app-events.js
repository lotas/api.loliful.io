/* global beforeEach */
/* global it */
/* global describe */
/* global beforeEach */
var should = require('should');
var loopback = require('loopback');
var appEvents = require('../../server/lib/app-events');

describe('AppEvents', function() {

    it('should have public interface', function(cb) {
        appEvents.emit.should.be.instanceOf(Function);
        appEvents.sendSlack.should.be.instanceOf(Function);
        appEvents._slackEnabled.should.be.instanceOf(Function);
        appEvents.EVENTS.should.be.instanceOf(Object);
        cb();
    });

    describe('emit', function() {
        var sent = {};

        beforeEach(function() {
            sent = {};
            appEvents._slackEnabled = function() {
                return true;
            };
            appEvents.sendSlack = function(title, fields) {
                sent = {
                    title: title,
                    fields: fields
                };
            };
        });

        it('should emit REPORT_ABUSE', function() {
            appEvents.emit(appEvents.EVENTS.REPORT_ABUSE, {
                id: 1,
                text: '2',
                reportedCount: 3
            }).then(() => {
                sent.title.should.containEql('Report [id: 1][text: 2][reported: 3]');
            });
        });
        it('should emit NEW_USER', function() {
            appEvents.emit(appEvents.EVENTS.NEW_USER, {
                name: 'test',
                accounts: {from:'fb'}
            }).then(() => {
                sent.title.should.containEql('New user test [{"from":"fb"}]');
            });
        });
        it('should emit NEW_INTRO', function() {
            appEvents.emit(appEvents.EVENTS.NEW_INTRO, {
                text: 'Text',
                userId: 1,
                id: 2
            }).then(() => {
                sent.title.should.containEql('New intro: Text [uid: 1][nailId: 2]');
            });
        });
        it('should emit NEW_OUTRO', function() {
            appEvents.emit(appEvents.EVENTS.NEW_OUTRO, {
                text: 'Text',
                userId: 1,
                nailId: 2
            }).then(() => {
                sent.title.should.containEql('New outro: Text [uid: 1][nailId: 2]');
            });
        });
        it('should emit INTRO_REMOVED', function() {
            appEvents.emit(appEvents.EVENTS.INTRO_REMOVED, {
                nailId: 1
            }).then(() => {
                sent.title.should.containEql('Intro removed [nailId: 1]');
            });
        });
        it('should emit OUTRO_REMOVED', function() {
            appEvents.emit(appEvents.EVENTS.OUTRO_REMOVED, {
                hammerId: 1
            }).then(() => {
                sent.title.should.containEql('Outro removed [hammerId: 1]');
            });
        });
        it('should emit NEW_CARD', function() {
            appEvents.emit(appEvents.EVENTS.NEW_CARD, {
                img: 'url'
            }).then(() => {
                sent.title.should.containEql('New card: url');
            });
        });
        it('should emit NEW_LIKE', function() {
            appEvents.emit(appEvents.EVENTS.NEW_LIKE, {
                id: 1,
                text: 'liked',
                userId: 2
            }).then(() => {
                sent.title.should.containEql('New like: liked [id: 1][uid: 2]');
            });
        });
        it('should emit NEW_UNLIKE', function() {
            appEvents.emit(appEvents.EVENTS.NEW_UNLIKE, {
                id: 1,
                text: 'liked',
                userId: 2
            }).then(() => {
                sent.title.should.containEql('New unlike: liked [id: 1][uid: 2]');
            });
        });
        it('should emit NAME_CHANGE', function() {
            appEvents.emit(appEvents.EVENTS.NAME_CHANGE, {
                from: 'from',
                to: 'to',
                userId: 2
            }).then(() => {
                sent.title.should.containEql('Name changed: from to to [uid: 2]');
            });
        });
        it('should emit INTRO_CHANGED', function() {
            appEvents.emit(appEvents.EVENTS.INTRO_CHANGED, {
                text: 'new',
                id: 2
            }).then(() => {
                sent.title.should.containEql('Intro changed: new [nailId: 2]');
            });
        });
        it('should emit OUTRO_CHANGED', function() {
            appEvents.emit(appEvents.EVENTS.OUTRO_CHANGED, {
                text: 'new',
                id: 2
            }).then(() => {
                sent.title.should.containEql('Outro changed: new [hammerId: 2]');
            });
        });
    });

});
