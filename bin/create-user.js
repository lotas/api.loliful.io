'use strict';

var request = require('request');
var config = require('../server/config.local.js');

var username = process.argv[2];
var password = process.argv[3];


var loopback = require('../server/server.js');

loopback.models.user.create({
        email: username,
        name: username,
        password: password
    }, function(err, res) {

        if (!err) {
            loopback.models.user.login({
                email: username,
                password: password
            }, function(err, authRes) {
                if (err) {
                    console.error(err);
                    return process.exit(2);
                }

                console.log("\n\n// to authorise in browser, paste this into your console ;) \n");
                console.log(`localStorage["$LoopBack$accessTokenId"]="${authRes.id}";`);
                console.log(`localStorage["$LoopBack$currentUserId"]="${authRes.userId}";`);
                console.log("\n\nTo create some data:\n");
                console.log(`node bin/faker-create-nails.js 10 http://localhost:${config.port} ${authRes.id}`);
                console.log(`node bin/faker-create-hammers.js 10 http://localhost:${config.port} ${authRes.id}`);
                console.log("\n\n");

                return process.exit(0);
            });
        } else {
            console.log(err, res);
            process.exit(1);
        }
    }
);
