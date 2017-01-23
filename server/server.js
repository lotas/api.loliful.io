/**
 Copyright © 2015 Yaraslau Kurmyza <lotas@eya.space>
 This work is free. You can redistribute it and/or modify it under the
 terms of the Do What The Fuck You Want To Public License, Version 2,
 as published by Sam Hocevar. See the COPYING file for more details.
 */

const loopback = require('loopback');
const boot = require('loopback-boot');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const debug = require('debug')('kontra');

var appConfig = require('./config.js');

var app = module.exports = loopback();

// Setup the view engine (jade)
var path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.locals.moment = require('moment');

// tmp images, would be moved to S3
app.use('/tmp', loopback.static(path.resolve(__dirname, '../tmp/')));

var passportConfigurator = bootstrapPassportAndConfig(app);

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
debug('boting app');
boot(app, __dirname, function() {
    debug('app booted');
});

// to support JSON-encoded bodies
app.middleware('parse', bodyParser.json({
    verify: require('./lib/fb')
}));
// to support URL-encoded bodies
app.middleware('parse', bodyParser.urlencoded({
    extended: true
}));

// The access token is only available after boot
app.middleware('auth', loopback.token({
    model: app.models.accessToken,
    headers: ['X-Auth']
}));

var RedisStore = require('connect-redis')(session);
app.middleware('session:before', cookieParser(app.get('cookieSecret')));
app.middleware('session', session({
    secret: app.get('sessionSecret'),
    saveUninitialized: true,
    resave: true,
    store: new RedisStore()
}));


/**
 * Flash messages for passport
 *
 * Setting the failureFlash option to true instructs Passport to flash an
 * error message using the message given by the strategy's verify callback,
 * if any. This is often the best approach, because the verify callback
 * can make the most accurate determination of why authentication failed.
 */
app.use(require('express-flash'));

passportConfigurator.setupModels({
    userModel: app.models.User,
    userIdentityModel: app.models.userIdentity,
    userCredentialModel: app.models.userCredential
});
/**** PASSPORT.js ***/


// -- Mount static files here--

// Stylus for now ..
// All static middleware should be registered at the end, as all requests
// passing the static middleware are hitting the file system
app.use(loopback.static(path.resolve(__dirname, '../client/public')));


// Requests that get this far won't be handled
// by any middleware. Convert them into a 404 error
// that will be handled later down the chain.
app.use(loopback.urlNotFound());

// The ultimate error handler.
app.use(loopback.errorHandler());
/**** loopback-passport-example */


function bootstrapPassportAndConfig(app) {
    // Create an instance of PassportConfigurator with the app instance
    var loopbackPassport = require('loopback-component-passport');
    var PassportConfigurator = loopbackPassport.PassportConfigurator;
    var passportConfigurator = new PassportConfigurator(app);
    // Configure passport strategies for third party auth providers
    // Load the provider configurations
    var existsSync = require('fs').existsSync;
    var config = {};
    try {
        config = require(appConfig.passportConfigFile);
    } catch (e) {
        config = require('./passport-providers.js');
    }
    for (var s in config) {
        var c = config[s];
        c.session = c.session !== false;
        passportConfigurator.configureProvider(s, c);
    }

    // Initialize passport
    passportConfigurator.init();
    return passportConfigurator;
}


app.start = function() {
    // start the web server
    return app.listen(function() {
        app.emit('started');
        console.log('Web server listening at: %s', app.get('url'));
    });
};

// start the server if `$ node server.js`
if (require.main === module) {

    if (!appConfig.flags.socketIO) {
        app.start();
        debug('app started (without SocketIO)');
    } else {
        app.io = require('socket.io')(app.start());
        debug('app started (with SocketIO)');

        require('socketio-auth')(app.io, {
            authenticate: function(socket, value, authCb) {
                if (!value || !value.userId) {
                    return authCb(null, false);
                }

                app.models.AccessToken.find({
                    where: {
                        and: [{
                            userId: value.userId
                        }, {
                            id: value.id
                        }]
                    }
                }, function(err, tokenDetail) {
                    if (err) {
                        debug('socketio-auth', err);
                        return authCb(null, false);
                    }
                    if (tokenDetail.length) {
                        socket.join(`user:${value.userId}`);
                        authCb(null, true);
                    } else {
                        authCb(null, false);
                    }
                });
            }
        });
    }
}
