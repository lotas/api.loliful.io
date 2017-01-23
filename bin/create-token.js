'use strict';

var id = process.argv[2];

var loopback = require('../server/server.js');

loopback.models.user.findById(id, function(err, user) {
    if (err || !user) {
        console.warn('User not found', err, user);
        return process.exit(1);
    }

    user.createAccessToken(9999999, {}, function(err, res) {
        if (err) {
            console.warn('Error creating token', err);
            return false;
        }

        console.log(`localStorage["$LoopBack$accessTokenId"]="${res.id}";`);
        console.log(`localStorage["$LoopBack$currentUserId"]="${user.id}";`);

        process.exit(0);
    });
});
