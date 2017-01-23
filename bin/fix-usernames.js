'use strict';

var server = require('../server/server');

// server.start();

server.models.user.find({
    where: {
        isDeleted: {neq: true}
    },
    limit: 9999999
}, (err, res) => {
    if (err) {
        console.warn(err);
        process.exit(1);
    }

    console.log(`Found ${res.length} users`);

    var saved = 0;
    function countSaves() {
        saved--;
    }

    res.forEach(user => {
        if (!user.name) {
            user.name = `loler#${user.id}`;
            saved++;
            user.save(countSaves);
        }
        console.log(user.name);
    });

    setTimeout(function checkSaves() {
        if (saved > 0 ) {
            setTimeout(checkSaves, 50);
        } else {
            process.exit(0);
        }
    }, 50);
});