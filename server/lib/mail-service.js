/* jshint maxlen: 500 */

var path = require('path');
var Mailgen = require('mailgen');
var debug = require('debug')('kontra:MailService');
var config = require('../config.js');

const templatesPath = path.resolve(__dirname, '../views/email/');

class MailService {
    constructor(emailSender) {
        if (!emailSender || !emailSender.send) {
            throw new Error('Invalid email sender supplied');
        }

        this.emailSender = emailSender;
        this.initMailgen();
    }

    initMailgen() {
        this.mailGenerator = new Mailgen({
            theme: {
                path: path.resolve(__dirname, '../views/emails/theme.html'),
                plaintextPath: path.resolve(__dirname, '../views/emails/theme.txt')
            },
            product: {
                name: 'Loliful',
                link: config.frontendUrl,
                logo: 'https://loliful.io/android-icon-96x96.png'
            }
        });
    }

    sendRawEmail(to, subject, html, text) {
        return new Promise((resolve, reject) => {
            debug(`Email to ${to}`);

            if (config.isTesting) {
                debug(`Subject: ${subject}`);
                debug(text);
                return resolve(false);
            }

            this.emailSender.send({
                to: to,
                from: '[Loliful] <yes-reply@loliful.io>',
                subject: subject,
                text: text,
                html: html
            }, (err, info) => {
                if (err) {
                    debug(err);
                    return reject(err);
                }
                debug(info);
                return resolve(info);
            });
        });
    }

    prepareDataForEmail(email) {
        // no special modifications yet
        return email;
    }

    generateHtml(email) {
        return this.mailGenerator.generate(this.prepareDataForEmail(email));
    }

    generateText(email) {
        return this.mailGenerator.generatePlaintext(this.prepareDataForEmail(email));
    }

    sendConfirmationEmail(actor) {
        var email = {
            body: {
                name: actor.name,
                intro: `To verify your "${actor.emailUnverified}" please click the link below`,
                action: {
                    button: {
                        text: 'Confirm email',
                        link: `${config.apiUrl}/users/confirm?uid=${actor.id}&token=${actor.verificationToken}`
                    }
                },
                outro: 'If you received this email by mistake, please ignore it.'
            }
        };

        // Generate an HTML email using mailgen
        var emailBody = this.mailGenerator.generate(email);
        var emailText = this.mailGenerator.generatePlaintext(email);

        return this.sendRawEmail(actor.emailUnverified, 'Please confirm your email at loliful', emailBody, emailText);
    }

    _dataSendNewReply(actor, notification, nail, hammer, user) {
        return {
            body: {
                name: actor.name,
                intro: `<a href="${config.frontendUrl}/profile/${user.id}">${ user && user.name ? user.name : 'Someone'}</a> replied to your intro!`,
                joke: {
                    intro: nail.getText(),
                    outro: hammer.getText()
                },
                outro: ['If you like this reply, go click the heart already :)'],
                goToAction: {
                    text: 'Visit joke',
                    link: `${config.frontendUrl}/nail/${nail.id}?utm_source=loliful&utm_medium=email&utm_campaign=reply`,
                    description: 'visit joke to like, flag, or share'
                },
                action: {
                    button: {
                        color: '#4DB8CD',
                        text: 'Go click the heart',
                        link: `${config.frontendUrl}/nail/${nail.id}?utm_source=loliful&utm_medium=email&utm_campaign=reply`,
                        linkShort: `${config.frontendUrl}/nail/${nail.id}?s=reply`
                    }
                }
            }
        };
    }

    sendNewReply(actor, notification, nail, hammer, user) {
        var email = this._dataSendNewReply(...arguments);
        var emailBody = this.generateHtml(email);
        var emailText = this.generateText(email);

        return this.sendRawEmail(actor.email, 'Someone replied to your intro', emailBody, emailText);
    }

    _dataSendReplySame(actor, notification, nail, hammer, user) {
        return {
            body: {
                name: actor.name,
                intro: `<a href="${config.frontendUrl}/profile/${user.id}">${ user && user.name ? user.name : 'Someone'}</a> replied to the same intro!`,
                joke: {
                    intro: nail.getText(),
                    outro: hammer.getText()
                },
                outro: ['If you like this reply, go click the heart already :)'],
                goToAction: {
                    text: 'Visit joke',
                    link: `${config.frontendUrl}/nail/${nail.id}?utm_source=loliful&utm_medium=email&utm_campaign=reply_same`,
                    description: 'visit joke to like, flag, or share'
                },
                action: {
                    button: {
                        color: '#4DB8CD',
                        text: 'Go click the heart',
                        link: `${config.frontendUrl}/nail/${nail.id}?utm_source=loliful&utm_medium=email&utm_campaign=reply_same`,
                        linkShort: `${config.frontendUrl}/nail/${nail.id}?sreply_same`
                    }
                }
            }
        };
    }

    sendReplySame(actor, notification, nail, hammer, user) {
        var email = this._dataSendReplySame(...arguments);
        var emailBody = this.generateHtml(email);
        var emailText = this.generateText(email);

        return this.sendRawEmail(actor.email, 'Someone replied to the same intro', emailBody, emailText);
    }

    _dataSendNewLike(actor, notification, nail, hammer, user) {
        let isIntro = notification.entity === 'nail';
        let type = isIntro ? 'intro' : 'outro';

        return {
            body: {
                name: actor.name,
                intro: `<a href="${config.frontendUrl}/profile/${user.id}">${ user && user.name ? user.name : 'Someone'}</a> liked your ${type}!`,
                joke: {
                    intro: isIntro ? '' : nail.getText(),
                    outro: isIntro ? nail.getText() : hammer.getText()
                },
                goToAction: {
                    text: 'Visit joke',
                    link: `${config.frontendUrl}/nail/${nail.id}?utm_source=loliful&utm_medium=email&utm_campaign=like`,
                    description: 'visit joke to like, flag, or share'
                },
                action: {
                    button: {
                        color: '#4DB8CD',
                        text: 'Visit joke',
                        link: `${config.frontendUrl}/nail/${nail.id}?utm_source=loliful&utm_medium=email&utm_campaign=like`,
                        linkShort: `${config.frontendUrl}/nail/${nail.id}?s=like`
                    }
                }
            }
        };
    }

    sendNewLike(actor, notification, nail, hammer, user) {
        let type = notification.entity === 'nail' ? 'intro' : 'outro';

        var email = this._dataSendNewLike(...arguments);
        var emailBody = this.generateHtml(email);
        var emailText = this.generateText(email);

        return this.sendRawEmail(actor.email, `Someone liked your ${type}`, emailBody, emailText);
    }

    _dataSendDigest(actor, nails, jokes) {
        return {
            body: {
                name: actor.name,
                digest: {
                    nails: nails,
                    jokes: jokes,
                },
                goToAction: {
                    text: 'Visit joke',
                    link: `${config.frontendUrl}/?utm_source=loliful&utm_medium=email&utm_campaign=like`,
                },
                action: {
                    button: {
                        color: '#4DB8CD',
                        text: 'Visit Loliful',
                        link: `${config.frontendUrl}/?utm_source=loliful&utm_medium=email&utm_campaign=like`,
                        linkShort: `${config.frontendUrl}/`
                    }
                }
            }
        };
    }

    sendDigest(actor, nails, jokes) {
        var email = this._dataSendDigest(...arguments);
        var emailBody = this.generateHtml(email);
        var emailText = this.generateText(email);

        return this.sendRawEmail(actor.email, `Loliful Digest`, emailBody, emailText);
    }
}

module.exports = MailService;
