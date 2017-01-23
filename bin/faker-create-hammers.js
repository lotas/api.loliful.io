'use strict';
/* jshint ignore:start */

var faker = require('faker');
var request = require('request');

var count = process.argv[2] || 10;
var url = process.argv[3] || 'http://localhost:3000/api';
var authToken = process.argv[4] || '';

request.get(
    `${url}/nails?access_token=${authToken}`,
    (err, req, body) => {
       if (err) return err;

       let response = JSON.parse(body);
       let t = 0;

       response.forEach((nail) => {
           t++;
           for (let i = 0; i < 2; i++) {
               setTimeout(() => {
                    request.post(`${url}/nails/${nail.id}/hammers?access_token=${authToken}`, {
                        form: {
                            text: faker.lorem.sentence()
                        }
                    });
               }, 100*i + t*10);
           }
       });
    }
);
/* jshint ignore:end */
