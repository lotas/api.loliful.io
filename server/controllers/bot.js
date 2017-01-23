'use strict';
/*jshint camelcase:false */

const loopback = require('loopback');
const moment = require('moment');
const request = require('request');
const crypto = require('crypto');

const debug = require('debug')('kontra:controller:bot');
const config = require('../config');
const apiUrl = config.apiUrl;

const appEvents = require('../lib/app-events');


const BOT_HELP_TEXT = `You can use the /lol command to get random joke from loliful.
If you simply want a text version, use  "/lol txt".
"/lol intro" will show you a random Intro, which you would like (or not) to answer.
"/lol mix" will give you a random Intro + random Outro, which can be funny  ¯\\_(ツ)_/¯
For any kind of feedback please write to hello@loliful.io`;

const FB_HELP_TEXT = `
    Just type "joke"
`;

const BOT_UNKOWN_CMD = [
    'Sorry, I cannot understand this',
    'What does this mean?',
    'Maybe I am not allowed to understand this yet',
    'uhmm',
    'really?',
    'I am not scared of the darkness anymore',
    'Hold on, trying to comprehend',
    'I am still trying to undertand what you just said',
    'No one is that funny',
    'Everything will be okay'
];


const BOT_SUPPORTED_CMD = [
    'help', 'h', '?',
    'card',
    'mix', 'mxi',
    'intro',
    'txt',
    'text'
];

const BOT_OFFENSE_RE = require('./bot-lib.js').offenseRegexp;
const BOT_OFFENSE_REPLIES = require('./bot-lib.js').offenseReplies;


module.exports = function(app) {
    var models = app.models;
    var router = app.loopback.Router();
    var modelUtils = require('../lib/model-helpers');

    app.use('/bot', router);

    router.get('/random/joke', function(req, res) {
        models.Share.getRandomCard()
            .then(card => {
                debug(`Random card: ${card.id}`);
                res.json({
                    id: card.id,
                    img: card.img,
                    text: card.getText()
                });
            })
            .catch(err => {
                return res.status(500).send('oooops');
            });
    });

    const SLACK_CMD_TOKEN = config.slackApp.cmdToken;

    router.post('/slack', function(req, res) {
        debug(req.body);

        if (req.body.token !== SLACK_CMD_TOKEN) {
            debug('Invalid token');
        }

        let cmd = String(req.body.text).trim() || 'card';

        if (BOT_SUPPORTED_CMD.indexOf(cmd) < 0) {
            if (BOT_OFFENSE_RE.test(cmd)) {
                sendSlackResponse(app, res, req.body, {
                    'response_type': 'in_channel',
                    text: BOT_OFFENSE_REPLIES[Math.floor(Math.random() * BOT_OFFENSE_REPLIES.length)]
                });
            }
        }

        if (cmd === 'help' || cmd === 'h' || cmd === '?') {
            return sendSlackResponse(app, res, req.body, BOT_HELP_TEXT);
        } else if (cmd === 'mix' || cmd === 'mxi') {

            Promise.all([
                models.Nail.getRandomIntro(),
                models.Hammer.getRandomOutro()
            ]).then(values => {
                    let intro = values[0];
                    let outro = values[1];

                    sendSlackResponse(app, res, req.body, {
                        'response_type': 'in_channel',
                        'text': 'Here is a mix:',
                        attachments: [{
                            fallback: intro.text,
                            color: '#4DB8CD',
                            title: intro.text,
                            'footer': intro.$user.name,
                            'title_link': `https://app.loliful.io/nail/${intro.id}`
                        }, {
                            fallback: outro.text,
                            color: '#4DB8CD',
                            title: outro.text,
                            'footer': outro.$user.name,
                            'title_link': `https://app.loliful.io/nail/${outro.nailId}`
                        }]
                    });
                })
                .catch(err => {
                    debug(err);
                    res.send('I cannot think right now. Let me take a nap.');
                });

        } else if (cmd === 'intro') {
            models.Nail.getRandomIntro()
                .then(nail => {
                    sendSlackResponse(app, res, req.body, {
                        'response_type': 'in_channel',
                        attachments: [{
                            fallback: nail.text,
                            color: '#4DB8CD',
                            title: nail.text,
                            'title_link': `https://app.loliful.io/nail/${nail.id}`,
                            footer: 'Loliful.io',
                            ts: (new Date(nail.created)).getTime()
                        }]
                    });
                })
                .catch(err => {
                    debug(err);
                    res.send('Bummer.. cannot find anything');
                });
        } else {
            let search = cmd.replace(/^(txt|text|card)\s*/, '');

            models.Share.getRandomCard(search)
                .then(card => {
                    if (cmd === 'txt' || cmd === 'text') {
                        sendSlackResponse(app, res, req.body, {
                            'response_type': 'in_channel',
                            text: card.getText()
                        });
                    } else {
                        sendSlackResponse(app, res, req.body, {
                            'response_type': 'in_channel',
                            attachments: [{
                                fallback: card.getText(),
                                color: '#4DB8CD',
                                'author_name': 'View in browser',
                                'author_icon': 'https://loliful.io/img/icon1/favicon-96x96.png',
                                'author_link': `https://loliful.io/card/${card.id}`,
                                'image_url': card.img
                            }]
                        });
                    }
                })
                .catch(err => {
                    debug(err);
                    res.send('Sorry, couldn\'t find anything');
                });
        }
    });

    // https://api.slack.com/apps/A2A63E9EE/oauth
    router.get('/slack/oauth', function(req, res) {
        let code = req.query.code;
        let state = req.query.state;

        if (!code) {
            return res.redirect('https://loliful.io/slack/');
        }

        debug(`New AddSlack oauth request code=${code}`);
        appEvents.emit(appEvents.EVENTS.SLACK_INSTALL, {});

        performSlackAuth(code)
            .then(teamInfo => {
                if (teamInfo.ok === false || !!teamInfo.error) {
                    appEvents.emit(appEvents.EVENTS.SLACK_AUTH_FAIL, teamInfo);
                    return res.redirect(`https://loliful.io/slack/?error=${teamInfo.error}`);
                }

                appEvents.emit(appEvents.EVENTS.SLACK_INSTALLED, teamInfo);

                ensureTeamExists(app, teamInfo)
                    .then(team => {
                        debug('Team saved or updated', team.teamId);
                        res.redirect('https://loliful.io/slack-installed/');
                    })
                    .catch(err => {
                        res.sendStatus(500);
                    });
            })
            .catch(err => {
                res.sendStatus(500);
            });

    });


    // fb
    router.get('/fb/webhook', function(req, res) {
        if (req.query['hub.mode'] === 'subscribe' &&
            req.query['hub.verify_token'] === config.fbBot.validationToken) {
            debug("Validating webhook");
            res.status(200).send(req.query['hub.challenge']);
        } else {
            console.error("Failed validation. Make sure the validation tokens match.");
            res.sendStatus(403);
        }
    });

    router.post('/fb/webhook', function(req, res) {
        var data = req.body;

        // Make sure this is a page subscription
        if (data.object === 'page') {
            // Iterate over each entry
            // There may be multiple if batched
            data.entry.forEach(function(pageEntry) {
                var pageID = pageEntry.id;
                var timeOfEvent = pageEntry.time;

                // Iterate over each messaging event
                pageEntry.messaging.forEach(function(messagingEvent) {
                    if (messagingEvent.optin) {
                        receivedAuthentication(messagingEvent);
                    } else if (messagingEvent.message) {
                        receivedMessage(messagingEvent, app);
                    } else if (messagingEvent.delivery) {
                        receivedDeliveryConfirmation(messagingEvent);
                    } else if (messagingEvent.postback) {
                        receivedPostback(messagingEvent);
                    } else if (messagingEvent.read) {
                        receivedMessageRead(messagingEvent);
                    } else if (messagingEvent.account_linking) {
                        receivedAccountLink(messagingEvent);
                    } else {
                        debug("Webhook received unknown messagingEvent: ", messagingEvent);
                    }

                    app.models.fbCalls.create({
                        pageId: pageID,
                        timeOfEvent: timeOfEvent,
                        request: messagingEvent
                    }, (err, item) => {
                        if (err) {
                            return debug(err);
                        }
                        debug('Log fb write done');
                    });
                });
            });

            // Assume all went well.
            //
            // You must send back a 200, within 20 seconds, to let us know you've
            // successfully received the callback. Otherwise, the request will time out.
            res.sendStatus(200);
        } else {
            res.sendStatus(500);
        }
    });

    /*
     * This path is used for account linking. The account linking call-to-action
     * (sendAccountLinking) is pointed to this URL.
     *
     */
    router.get('/fb/authorize', function(req, res) {
        var accountLinkingToken = req.query.account_linking_token;
        var redirectURI = req.query.redirect_uri;

        // Authorization Code should be generated per user by the developer. This will
        // be passed to the Account Linking callback.
        var authCode = "qwertyuu";

        // Redirect users to this URI on successful login
        var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

        res.render('authorize', {
            accountLinkingToken: accountLinkingToken,
            redirectURI: redirectURI,
            redirectURISuccess: redirectURISuccess
        });
    });

};

function sendSlackResponse(app, res, cmd, payload) {
    if (typeof payload === 'string') {
        res.send(payload);
    } else {
        res.json(payload);
    }

    app.models.slackCalls.create({
        teamId: cmd['team_id'],
        teamDomain: cmd['team_domain'],
        token: cmd['token'],
        channelId: cmd['channel_id'],
        channelName: cmd['channel_name'],
        userId: cmd['user_id'],
        userName: cmd['user_name'],
        command: cmd['command'],
        text: cmd['text'],
        responseUrl: cmd['response_url'],
        response: payload
    }, (err, item) => {
        if (err) {
            return debug(err);
        }
        debug('Log write done');
    });
}


function performSlackAuth(code) {
    var authUrl = 'https://slack.com/api/oauth.access?';
    authUrl += 'client_id=' + config.slackApp.clientId;
    authUrl += '&client_secret=' + config.slackApp.secret;
    authUrl += '&code=' + code;
    authUrl += '&redirect_uri=https://api.loliful.io/bot/slack/oauth';

    return new Promise((resolve, reject) => {
        request.get(authUrl, (error, response, body) => {
            if (error) {
                debug('Error requesting slack code', error);
                return reject(error);
            }

            const _body = JSON.parse(body);
            debug('Slack auth completed', _body);

            resolve(_body);
        });
    });
}

function ensureTeamExists(app, teamInfo) {
    return new Promise((resolve, reject) => {
        app.models.slackTeam.findOne({
            where: {
                teamId: teamInfo['team_id']
            }
        }, (err, team) => {
            if (err) {
                debug('Error finding team: ', err);
                return reject(err);
            }

            if (team) {
                team.token = teamInfo['access_token'];
                team.scope = teamInfo['scope'];
                team.response = teamInfo['response'];
                team.save((err, res) => {
                    if (err) {
                        debug('Error saving team', err);
                    }
                    resolve(team);
                });
            } else {
                app.models.slackTeam.create({
                    teamId: teamInfo['team_id'],
                    name: teamInfo['team_name'],
                    token: teamInfo['access_token'],
                    scope: teamInfo['scope'] || '',
                    response: teamInfo
                }, (err, team) => {
                    if (err) {
                        debug('Error creating team', err);
                        return reject(err);
                    }

                    resolve(team);
                });
            }
        });
    });
}


/****
 *  "url": "https://github.com/fbsamples/messenger-platform-samples.git"
 *
 *  FB BOT
 *
 */

const SERVER_URL = 'https://loliful.io';

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;

    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger'
    // plugin.
    var passThroughParam = event.optin.ref;

    debug("Received authentication for user %d and page %d with pass " +
        "through param '%s' at %d", senderID, recipientID, passThroughParam,
        timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event, app) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    debug("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    debug(JSON.stringify(message));

    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // You may get a text or attachment but not both
    var messageText = (message.text || '').toLowerCase();
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;

    if (isEcho) {
        // Just logging message echoes to console
        debug("Received echo for message %s and app %d with metadata %s",
            messageId, appId, metadata);
        return;
    } else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        debug("Quick reply for message %s with payload %s",
            messageId, quickReplyPayload);

        sendTextMessage(senderID, "Quick reply tapped");
        return;
    }

    if (messageText) {

        if (BOT_OFFENSE_RE.test(messageText)) {
            sendTextMessage(senderID, BOT_OFFENSE_REPLIES[Math.floor(Math.random() * BOT_OFFENSE_REPLIES.length)]);
            return;
        }

        if (messageText.match(/^(card|joke)/)) {
            let search = messageText.replace(/^(card|joke)\s*/, '');
            sendRandomCard(senderID, app, search);
        } else if (messageText.match(/^(text|txt)/)) {
            let search = messageText.replace(/^(txt|text)\s*/, '');
            sendRandomCard(senderID, app, search, 'text');
        } else if (messageText.match(/(help|use you|use it)/)) {
            sendTextMessage(senderID, FB_HELP_TEXT);
        } else if (messageText.match(/understand/)) {
            sendTextMessage(senderID, 'What about you?');
        } else if (messageText.match(/how are you/)) {
            sendTextMessage(senderID, 'Good, thank you');
        } else if (messageText.match(/(come on|bring it on)/)) {
            sendTextMessage(senderID, 'Give me another try');
        } else if (messageText.match(/have a nice/)) {
            sendTextMessage(senderID, 'Thanks, you too!');
        } else {

            // If we receive a text message, check to see if it matches any special
            // keywords and send back the corresponding example. Otherwise, just echo
            // the text we received.
            switch (messageText) {
                case 'mix':
                case 'mxi':
                    sendRandomMix(senderID, app);
                    break;

                case 'account linking':
                    sendAccountLinking(senderID);
                    break;

                case 'hi':
                case 'hello':
                case 'good day':
                case 'good morning':
                case 'good evening':
                    sendTextMessage(senderID, 'Hi, lovely person');
                    break;

                case 'hey':
                    sendTextMessage(senderID, 'Wazup?');
                    break;

                case 'good one':
                    sendTextMessage(senderID, 'Yay!');
                    break;

                case 'hola':
                    sendTextMessage(senderID, 'Mucho gusto');
                    break;

                case 'thank you':
                case 'thanks':
                case 'thnx':
                    sendTextMessage(senderID, 'Always welcome!');
                    break;

                case 'knock knock':
                    sendTextMessage(senderID, 'Who is there?');
                    break;

                case 'sure':
                    sendTextMessage(senderID, 'Sure?');
                    break;

                default:
                    sendTextMessage(senderID, BOT_UNKOWN_CMD[Math.floor(Math.random() * BOT_UNKOWN_CMD.length)]);
                    break;
            }
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
        messageIDs.forEach(function(messageID) {
            debug("Received delivery confirmation for message ID: %s",
                messageID);
        });
    }

    debug("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    debug("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderID, "Postback called");
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 *
 */
function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    debug("Received message read event for watermark %d and sequence " +
        "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 *
 */
function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    debug("Received account link event with for user %d with status %s " +
        "and auth code %s ", senderID, status, authCode);
}



function sendRandomCard(recipientId, app, search, format) {
    app.models.Share.getRandomCard(search)
        .then(card => {
            if (format === 'text') {
                sendTextMessage(recipientId, card.getText());
            } else {
                callSendAPI({
                    recipient: {
                        id: recipientId
                    },
                    message: {
                        attachment: {
                            type: "image",
                            payload: {
                                url: card.img
                            }
                        }
                    }
                });
            }
        })
        .catch(err => {
            debug(err);
            sendTextMessage(recipientId, 'Sorry, couldn\'t find anything');
        });
}

function sendRandomMix(recipientId, app) {
    Promise.all([
        app.models.Nail.getRandomIntro(),
        app.models.Hammer.getRandomOutro()
    ]).then(values => {
        let intro = values[0];
        let outro = values[1];

        sendTextMessage(recipientId, `
- ${intro.text}
- ${outro.text}
`);
    }).catch(err => {
        debug(err);
        sendTextMessage(recipientId, 'Sorry, couldn\'t find anything');
    });
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendFileMessage(recipientId, type, url) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: type,
                payload: {
                    url: url
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText,
            metadata: `${Date.now()}`
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "This is test text",
                    buttons: [{
                        type: "web_url",
                        url: "https://www.oculus.com/en-us/rift/",
                        title: "Open Web URL"
                    }, {
                        type: "postback",
                        title: "Trigger Postback",
                        payload: "DEVELOPER_DEFINED_PAYLOAD"
                    }, {
                        type: "phone_number",
                        title: "Call Phone Number",
                        payload: "+16505551234"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "rift",
                        subtitle: "Next-generation virtual reality",
                        item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: SERVER_URL + "/assets/rift.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/rift/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for first bubble",
                        }],
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: SERVER_URL + "/assets/touch.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/touch/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for second bubble",
                        }]
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "What's your favorite movie genre?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Action",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
                },
                {
                    "content_type": "text",
                    "title": "Comedy",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
                },
                {
                    "content_type": "text",
                    "title": "Drama",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
                }
            ]
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
    debug("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
    debug("Turning typing indicator on");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_on"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
    debug("Turning typing indicator off");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };

    callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "Welcome. Link your account.",
                    buttons: [{
                        type: "account_link",
                        url: "https://api.loliful.io/bot/fb/authorize"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: config.fbBot.pageAcccessToken},
        method: 'POST',
        json: messageData
    }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                debug("Successfully sent message with id %s to recipient %s", messageId, recipientId);
            } else {
                debug("Successfully called Send API for recipient %s", recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}