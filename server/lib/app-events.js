var debug = require('debug')('kontra:app-events');
var config = require('../config.js');

var app = require('../server');

const events = {
    REPORT_ABUSE: 'report_abuse',
    NEW_USER: 'new_user',
    NEW_INTRO: 'new_intro',
    NEW_OUTRO: 'new_outro',
    INTRO_REMOVED: 'intro_removed',
    OUTRO_REMOVED: 'outro_removed',
    INTRO_CHANGED: 'intro_changed',
    OUTRO_CHANGED: 'outro_changed',
    NEW_LIKE: 'new_like',
    NEW_UNLIKE: 'new_unlike',
    NEW_CARD: 'new_card',
    NAME_CHANGE: 'name_change',
    EMAIL_CHANGE: 'email_change',

    SLACK_INSTALL: 'slack_install',
    SLACK_INSTALLED: 'slack_installed',
    SLACK_AUTH_FAIL: 'slack_auth_fail',
};

var service = {
    EVENTS: events,
    emit: emit,
    sendSlack: sendSlack,
    _slackEnabled: slackEnabled
};

module.exports = service;

var slack = config.slackNotify.enabled ? require('slack-notify')(config.slackNotify.hookUrl) : false;

function slackEnabled() {
    return config.slackNotify.enabled;
}

/**
 *
 * @param eventName
 * @param params
 */
function emit(eventName, params = {}) {
    debug(`app-event: ${eventName}`, params);

    var promises = [];

    if (params.userId) {
        promises.push(
            getUser(params.userId).then(user => params.user = user)
        );
    }
    if (params.nailId) {
        promises.push(
            getNail(params.nailId).then(nail => params.nail = nail)
        );
    }

    if (!service._slackEnabled()) {
        return false;
    }

    return Promise.all(promises).then(() => {
        sendToSlack(eventName, params);
    });
}


function sendToSlack(eventName, params) {
    switch (eventName) {
        case events.REPORT_ABUSE:
            service.sendSlack(`Report [id: ${params.id}][text: ${params.text}][reported: ${params.reportedCount}]`);
            break;
        case events.NEW_USER:
            service.sendSlack(`New user ${params.name} [${JSON.stringify(params.accounts)}]`);
            break;
        case events.NEW_INTRO:
            service.sendSlack(`New intro: ${params.text} [u: ${formatUser(params)}][n: ${formatNail(params)}]`);
            break;
        case events.NEW_OUTRO:
            /* jshint maxlen: 500 */
            service.sendSlack(`New outro: ${params.text} [u: ${formatUser(params)}][n: ${formatNail(params)}]`);
            break;
        case events.INTRO_REMOVED:
            service.sendSlack(`Intro removed [nailId: ${params.nailId}]`);
            break;
        case events.OUTRO_REMOVED:
            service.sendSlack(`Outro removed [hammerId: ${params.hammerId}]`);
            break;
        case events.NEW_CARD:
            service.sendSlack(`New card: ${params.img}`);
            break;
        case events.NEW_LIKE:
            service.sendSlack(`New like: ${params.text} [id: ${params.id}][u: ${formatUser(params)}]`);
            break;
        case events.NEW_UNLIKE:
            service.sendSlack(`New unlike: ${params.text} [id: ${params.id}][u: ${formatUser(params)}]`);
            break;
        case events.NAME_CHANGE:
            service.sendSlack(`Name changed: ${params.from} to ${params.to} [u: ${formatUser(params)}]`);
            break;
        case events.INTRO_CHANGED:
            service.sendSlack(`Intro changed: ${params.text} [n: ${formatNail(params)}]`);
            break;
        case events.OUTRO_CHANGED:
            service.sendSlack(`Outro changed: ${params.text} [hammerId: ${params.id}]`);
            break;
        case events.SLACK_INSTALL:
            service.sendSlack(`Slack installation request`);
            break;
        case events.SLACK_INSTALLED:
            service.sendSlack('Slack installed. ' +
                `Team: ${params['team_name']} TeamId: ${params['team_id']}`);
            break;
        case events.SLACK_AUTH_FAIL:
            service.sendSlack(`Slack auth failed ${params['error']}`);
            break;
    }
}

function formatUser(params) {
    if (params.user) {
        return `<${config.frontendUrl}/profile/${params.userId}|${params.userId}>: ${params.user.name}`;
    }
    return params.userId;
}
function formatNail(params) {
    let nailId = params.nailId || params.id;
    let str = `<${config.frontendUrl}/nail/${nailId}|${nailId}>`;
    if (params.nail) {
        str += `: ${params.nail.text}`;
    }
    return str;
}

function sendSlack(title, fields, channel = config.slackNotify.channel) {
    process.nextTick(function() {
        slack.send({
            channel: channel,
            text: title,
            fields: fields,
            username: config.slackNotify.username
        });
    });
}

function getUser(id) {
    return new Promise((resolve, reject) => {
        app.models.User.findById(id, (err, user) => {
            if (err) {
                return reject(err);
            }
            resolve(user);
        });
    });
}
function getNail(id) {
    return new Promise((resolve, reject) => {
        app.models.Nail.findById(id, (err, nail) => {
            if (err) {
                return reject(err);
            }
            resolve(nail);
        });
    });
}