/* jshint ignore:start */

var faker = require('faker');
var request = require('request');

var count = process.argv[2] || 10;
var url = process.argv[3] || 'http://localhost:3000/api';
var authToken = process.argv[4] || '';

for(; count--;) {
    request.post(url + '/nails?access_token=' + authToken, {
        form: {
            text: faker.lorem.sentence()
        }
    });
}
/* jshint ignore:end */