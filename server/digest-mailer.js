/**
 Copyright © 2016 Yaraslau Kurmyza <yarik@loliful.io>
 */

var loopback = require('loopback');
var boot = require('loopback-boot');

const co = require('co');

const moment = require('moment');

var debug = require('debug')('kontra:mailerDigest');
var appConfig = require('./config.js');


var MailService = require('./lib/mail-service');

const LOOP_TIMEOUT = 5000;
const LOOP_LONG_TIMEOUT = 60000;

var app = loopback();

// disable notification limitToActor
process.env.KONTRA_LIMIT_TO_ACTOR = false;

debug('boting app');
boot(app, __dirname, mailLoop);

function mailLoop() {
    let user = app.models.user;
    let Nail = app.models.nail;
    let Hammer = app.models.hammer;
    let notificationSettings = app.models.notificationSettings;

    var mailService = new MailService(app.models.Email);

    console.log('starting digest');

    co(function* (){
        // get next notification to sent
        let users = yield getUsers();

        for (let user of users) {
            debug(`Sending digest to ${user.email}`);

            let nails = yield Nail.getRecentNails(user);
            let jokes = yield Hammer.getRecentJokes(user);

            yield mailService.sendDigest(user, nails, jokes);
        }
    }).then(() => {
        console.log('Digest finished');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });

    return false;

    function getUsers() {
        return new Promise((resolve, reject) => {
            user.find({
                where: {
                    id: {
                        inq: [2,3]
                    }
                }
            }, (err, users) => {
                if (err) {
                    return reject(err);
                }
                resolve(users);
            });
        });
    }

}
