/**
 Copyright © 2016 Yaraslau Kurmyza <yarik@loliful.io>
 */

var loopback = require('loopback');
var boot = require('loopback-boot');

const moment = require('moment');

var debug = require('debug')('kontra:mailer');
var appConfig = require('./config.js');


var NotificationType = require('../common/models/notification-type');
var MailService = require('./lib/mail-service');


const LOOP_TIMEOUT = 5000;
const LOOP_LONG_TIMEOUT = 60000;
const NOTIFICATION_EMAILED = 1;
const NOTIFICATION_NOT_EMAILED_NO_SETTING = 2;
const NOTIFICATION_NOT_EMAILED_DISABLED = 3;
const NOTIFICATION_NOT_EMAILED_ALREADY_READ = 4;
const NOTIFICATION_NOT_EMAILED_NO_EMAIL = 5;
const NOTIFICATION_NOT_EMAILED_ALREADY_SENT = 6;

var app = loopback();

var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

// disable notification limitToActor
process.env.KONTRA_LIMIT_TO_ACTOR = false;

debug('boting app');
boot(app, __dirname, mailLoop);


function mailLoop() {
    let notification = app.models.notification;
    let user = app.models.user;
    let Nail = app.models.nail;
    let Hammer = app.models.hammer;
    let notificationSettings = app.models.notificationSettings;

    var mailService = new MailService(app.models.Email);

    // get next notification to sent
    notification.findOne({
        where: {
            and: [{
                    // only not emailed ones
                    or: [
                        {isEmailed: null},
                        {isEmailed: 0}
                    ]
                },
                // and not read ones
                {isRead: 0},
                // and created more than an hour ago
                {date: {gt: moment().subtract(1, 'hour').toDate() }},
                // and of some type only
                {
                    type: {
                        inq: [NotificationType.LIKE, NotificationType.REPLY, NotificationType.REPLY_SAME]
                    }
                }
            ]
        },
        order: 'id ASC'
    }, (err, notification) => {
        if (err) {
            return errorHandler(err);
        }

        if (!notification) {
            debug('No notifications left to send, sleeping');
            return setTimeout(mailLoop, LOOP_LONG_TIMEOUT);
        }

        debug(`Processing notification %o`, notification);

        if (notification.isRead === 1) {
            debug('Notification was already marked as Read, skipping');

            notification.isEmailed = NOTIFICATION_NOT_EMAILED_ALREADY_READ;
            return notification.save(errorHandler, restart);
        }

        // TODO make advanced mapping
        let settingType = notificationSettingByNotificationType(notification.type);

        // check if user has disabled notifications
        let data = {
            userId: notification.userId
        };
        notificationSettings.findOrCreate({where: data}, data, (err, settings, created) => {
            if (err) {
                return errorHandler(err);
            }

            if (created) {
                debug(`Created new notification settings record for ${data.userId}`);
            }

            if (!settings) {
                debug(`User ${notification.userId} has no email settings. How is that possible?`);

                notification.isEmailed = NOTIFICATION_NOT_EMAILED_NO_SETTING;
                return notification.save(errorHandler, restart);
            }

            if (settings[settingType] === 0) {
                debug(`User ${notification.userId} has disabled this type of notifications! Skipping`);

                notification.isEmailed = NOTIFICATION_NOT_EMAILED_DISABLED;
                return notification.save(errorHandler, restart);
            }

            if (settings.lastEmailed && moment(settings.lastEmailed).add(1, 'hour').unix() > moment().unix()) {
                debug(`User ${notification.userId} already received email within last 1 hour. Skipping`);

                notification.isEmailed = NOTIFICATION_NOT_EMAILED_ALREADY_SENT;
                return notification.save(errorHandler, restart);
            }

            // Ok, looks like we can finally send this one
            user.findById(notification.userId, (err, recipient) => {
                if (err) {
                    debug(`Notification recipient doesn't exist ${notification.userId}`);
                    return restart();
                }

                if (recipient.email.match(/noemail.loliful.io/)) {
                    debug(`User email is not set ${recipient.email}`);
                    notification.isEmailed = NOTIFICATION_NOT_EMAILED_NO_EMAIL;
                    return notification.save(errorHandler, restart);
                }

                if (notification.type === NotificationType.REPLY) {
                    Promise.all([
                        getNailPromise(notification.nailId),
                        getHammerPromise(notification.hammerId),
                        getUserPromise(notification.actorId)
                    ]).then(values => {
                        mailService.sendNewReply(recipient, notification, values[0], values[1], values[2]);
                    });
                } else if (notification.type === NotificationType.LIKE) {
                    Promise.all([
                        getNailPromise(notification.nailId),
                        getHammerPromise(notification.entity === 'hammer' ?
                            notification.entityId : notification.hammerId),
                        getUserPromise(notification.actorId)
                    ]).then(values => {
                        mailService.sendNewLike(recipient, notification, values[0], values[1], values[2]);
                    });
                } else if (notification.type === NotificationType.REPLY_SAME) {
                    Promise.all([
                        getNailPromise(notification.nailId),
                        getHammerPromise(notification.hammerId),
                        getUserPromise(notification.actorId)
                    ]).then(values => {
                        mailService.sendReplySame(recipient, notification, values[0], values[1], values[2]);
                    });
                }

                debug(`Email to ${recipient.email} was sent!`);

                notification.isEmailed = NOTIFICATION_EMAILED;
                notification.save(errorHandler, restart);

                settings.lastEmailed = moment();
                settings.updateAttribute('lastEmailed', settings.lastEmailed);
            });
        });
    });

    function getNailPromise(nailId) {
        return new Promise((resolve, reject) => {
            if (!nailId) {
                return resolve(null);
            }
            Nail.findById(nailId, (err, nail) => {
                if (err) {
                    debug(err);
                    return reject(err);
                }
                resolve(nail);
            });
        });
    }
    function getHammerPromise(hammerId) {
        return new Promise((resolve, reject) => {
            if (!hammerId) {
                return resolve(null);
            }
            Hammer.findById(hammerId, (err, hammer) => {
                if (err) {
                    debug(err);
                    return reject(err);
                }
                resolve(hammer);
            });
        });
    }
    function getUserPromise(userId) {
        return new Promise((resolve, reject) => {
            user.findById(userId, (err, user) => {
                if (err) {
                    debug(err);
                    return reject(err);
                }
                resolve(user);
            });
        });
    }

    function errorHandler(err) {
        debug(err);
        return restart();
    }
    function restart() {
        return setTimeout(mailLoop, LOOP_TIMEOUT);
    }

    function notificationSettingByNotificationType(type) {
        let mapping = {
            [NotificationType.REPLY]: 'emailReply',
            [NotificationType.LIKE]: 'emailLike',
            [NotificationType.REPLY_SAME]: 'emailReplySameIntro'
        };

        return mapping[type] || false;
    }
}
