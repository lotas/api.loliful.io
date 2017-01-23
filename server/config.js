var _ = require('lodash');

var path = require('path');
var appEnv = process.env.NODE_ENV || 'dev';

if (appEnv === 'prod') {
    throw new Error('Env must be production, not prod');
}

var baseConfig = {
    env: appEnv,
    isDevEnv: appEnv === 'dev',
    isTesting: appEnv === 'testing',
    isStaging: appEnv === 'staging',
    isProd: appEnv === 'production',

    flags: {
        signupEnabled: false,
        socketIO: false
    },

    paths: {
        server: __dirname,
        tmp: path.join(__dirname, '../tmp/'),
        public: path.join(__dirname, '../public/'),
        phantomJs: require('phantomjs-prebuilt').path,
        cards: process.env.CARDS_PATH || path.join(__dirname, '../public/share/')
    },

    frontendUrl: 'http://local.loliful.io',
    apiUrl: 'http://local.loliful.io',

    passportConfigFile: './passport-providers.' + appEnv + '.js',

    logDirectory: path.join(__dirname, '/../log'),
    logFormat: '[:date[iso]] :ip - :remote-user ":method :url HTTP/:http-version" ' +
    ':status :res[content-length] ":referrer" ":user-agent" :auth [:response-time ms]',

    // Abuse reports
    minAbuseCount: 2, // all above would be notified

    // allow removal of own items within this time span
    removeTimeSpan: 30 * 60 * 1000,

    limits: {
        hour: {
            nail: 50,
            hammer: 100
        },
        day: {
            nail: 200,
            hammer: 500
        }
    },

    s3: {
        enabled: false,
        bucket: ''
    },

    slackNotify: {
        enabled: false,
        hookUrl: '',
        channel: '#alerts',
        username: 'lolibot'
    },

    emailList: {
        provider: 'mailchimp', // the only option right now
        apiUrl: 'https://us1.api.mailchimp.com/3.0',
        apiKey: 'apiKey',
        digestListId: 'digestId' // test list id
    },

    slackApp: {
        clientId: 'slackClientId',
        secret: 'slackSecret',
        cmdToken: 'cmdToken',
        verificationToken: 'slackVerifToken'
    },

    /* jshint ignore:start */
    fbBot: {
        appSecret: 'fbBotSecret',
        pageAcccessToken: 'pageAcccessToken',
        validationToken: 'validationToken'
    }
    /* jshint ignore:end */

};

const envConfigs = {
    dev: {
        frontendUrl: 'http://localhost:3100/index.html#',
        apiUrl: 'http://local.loliful.io',
        flags: {
            socketIO: true
        }
    },

    testing: {
        frontendUrl: 'http://local.loliful.io',
        apiUrl: 'http://local.loliful.io',
        flags: {
            socketIO: false
        }
    },

    staging: {
        frontendUrl: 'https://dev.loliful.io',
        apiUrl: 'https://api.dev.loliful.io',
        s3: {
            enabled: true,
            bucket: 'next.loliful'
        },
        flags: {
            socketIO: true
        },
        slackNotify: {
            enabled: true,
            hookUrl: 'slackHookUrl',
            channel: '#loliful-stats',
            username: 'lolibot-dev'
        }
    },

    production: {
        frontendUrl: 'https://app.loliful.io',
        apiUrl: 'https://api.loliful.io',
        s3: {
            enabled: false,
            bucket: 'loliful'
        },
        slackNotify: {
            enabled: true,
            hookUrl: 'slackHookUrl',
            channel: '#loliful-stats'
        },
        emailList: {
            apiKey: 'emailListProd',
            digestListId: 'emailListDigestId'
        }
    }
};


module.exports = _.merge(
    baseConfig,
    envConfigs[appEnv]
);
