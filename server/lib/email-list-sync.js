'use strict';

const request = require('request');
const crypto = require('crypto');

const debug = require('debug')('kontra:emaillist');

const config = require('../config.js');
const apiKey = config.emailList.apiKey;
const apiUrl = config.emailList.apiUrl;
const digestListId = config.emailList.digestListId;

const LIST_TYPES = {
    DIGEST: 'digest'
};
const SUBSCRIPTION_STATUS = {
    subscribed: 'subscribed',
    unsubscribed: 'unsubscribed'
};

module.exports = {
    LIST_TYPES: LIST_TYPES,
    subscribe: subscribe,
    unsubscribe: unsubscribe
};

function subscribe(userEmail, list = LIST_TYPES.DIGEST) {
    debug(`Subscribing to list:${list} user:${userEmail}`);
    updateSubscriptionStatus(digestListId, userEmail, SUBSCRIPTION_STATUS.subscribed);
}

function unsubscribe(userEmail, list = LIST_TYPES.DIGEST) {
    debug(`Unsubscribing to list:${list} user:${userEmail}`);
    updateSubscriptionStatus(digestListId, userEmail, SUBSCRIPTION_STATUS.unsubscribed);
}

function updateSubscriptionStatus(listId, email, status = 'subscribed') {
    let listUrl = `/lists/${listId}/members`;

    callMailchimpApi(listUrl, {
        'email_address': email,
        status: status
    })
    .then(body => {
        // updated ok
        debug('Updated status ok', email, status);
    })
    .catch(err => {
        debug('Not updated status, record exists', err);

        // update instead
        let patchUrl = `${listUrl}/${md5(email)}`;
        callMailchimpApi(patchUrl, {status: status}, 'PATCH')
            .then(body => {
                debug('Updated ok', email, status);
            })
            .catch(err => {
                debug('Giving up.. cannot update', err);
            });
    });
}

function md5(str) {
    return crypto.createHash('md5')
                .update(str)
                .digest('hex');
}

function callMailchimpApi(url, data, method = 'POST') {
    return new Promise((resolve, reject) => {
        request({
            url: `${apiUrl}${url}`,
            method: method,
            body: JSON.stringify(data),
            headers: {
                Authorization: `apikey ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }, function(err, response, body) {
            if (err) {
                debug(err);
                return reject(err);
            }

            debug(`Mailchimp API Response: ${body}`);

            if (response.statusCode > 204) {
                return reject(body);
            }

            resolve(body);
        });
    });
}