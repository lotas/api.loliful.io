/**
 * http://stackoverflow.com/questions/23494956/how-to-use-morgan-logger
 *
 *  https://github.com/expressjs/morgan/issues/24  loggly TODO
 */

var FileStreamRotator = require('file-stream-rotator');
var fs = require('fs');
var morgan = require('morgan');
var config = require('../config.js');

module.exports = attachLogger;


function attachLogger(app) {
    if (config.isDevEnv) {
        app.use(morgan('dev'));
    } else if (config.isTesting) {
        // do nothing
    } else {
        if (!fs.existsSync(config.logDirectory)) {
            fs.mkdirSync(config.logDirectory);
        }

        var accessLogStream = FileStreamRotator.getStream({
            filename: config.logDirectory + '/access-%DATE%.log',
            frequency: 'daily',
            date_format: 'YYYY-MM-DD', //jshint ignore:line
            verbose: false
        });

        app.use(morgan(config.logFormat, {stream: accessLogStream}));
    }
}

morgan.token('auth', function (req, res) {
    if (!req.accessToken || !req.accessToken.userId) {
        return '[guest]';
    }
    return `[userId: ${req.accessToken.userId}]`;
});

morgan.token('ip', function (req) {
    if (req.headers['x-real-ip']) {
        return req.headers['x-real-ip'];
    }

    return req.connection.remoteAddress;
});
