'use strict';

var server = require('../server/server');

// server.start();
console.log('Fixing broken hammer records: Without users and nails');

server.models.hammer.find({
    where: {
    },
    limit: 999999
}, (err, res) => {
    if (err) {
        console.warn(err);
        process.exit(1);
    }

    console.log(`Total ${res.length} hammers`);

    var saved = 0;
    var removed = 0;
    function countSaves() {
        saved--;
    }

    res.forEach(hammer => {
        server.models.nail.findById(hammer.nailId, (err, nail) => {
            if (err || !nail) {
                console.log(`Hammer #${hammer.id} without nail #${hammer.nailId}, removing`);
                removed++;
                saved++;
                hammer.remove(countSaves);
            }
        });
        server.models.user.findById(hammer.userId, (err, user) => {
            if (err || !user) {
                console.log(`Hammer #${hammer.id} without user #${hammer.userId}, removing`);
                removed++;
                saved++;
                hammer.remove(countSaves);
            }
        });
    });

    setTimeout(function checkSaves() {
        if (saved > 0 ) {
            setTimeout(checkSaves, 50);
        } else {
            console.log(`Removed total: ${removed}`);
            process.exit(0);
        }
    }, 500);
});