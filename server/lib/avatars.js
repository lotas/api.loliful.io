'use strict';

var crypto = require('crypto');
var request = require('request');


function guessAvatar(user) {
    //if (user && user.email) {
    //
    //}
}


/**
 * Profile data: https://en.gravatar.com/site/implement/profiles/json/
 *
 * <img src="https://secure.gravatar.com/avatar/xxHASHxx?d=urlencodedDefaultUrl" />
 */
function checkGravatar() {
    // http://en.gravatar.com/1c210b522fb75d337c7aab3884f0064d.json

}


/**
 * Get md5 hash
 * @param string
 * @returns {*}
 */
function md5(string) {
    return crypto.createHash('md5')
                .update(string)
                .digest('hex');
}

module.exports.guessAvatar = guessAvatar;
