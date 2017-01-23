'use strict';

var debug = require('debug')('kontra:script');
var _ = require('lodash');
var server = require('../server/server');

// server.start();
debug('Query users');

server.models.user.find({
    limit: 9999999
}, (err, res) => {
    if (err) {
        console.warn(err);
        process.exit(1);
    }
    console.log(`Found ${res.length} users`);

    var saved = 0;
    function countSaves() {
        debug('+1 ready');
        saved--;
    }

    res.forEach(user => {
        debug('Processing user', user.id);

        server.models.userIdentity.updateUserSocialAccounts(user.id, countSaves);
        saved++;
    });

    setTimeout(function checkSaves() {
        if (saved > 0 ) {
            setTimeout(checkSaves, 50);
        } else {
            process.exit(0);
        }
    }, 50);
});
