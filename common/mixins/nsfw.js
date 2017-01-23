var debug = require('debug')('kontra:mixin:nsfw');

/**
 * Sets nsfw property to true
 */
module.exports = function(Model) {

    // give each dog a unique tag for tracking
    Model.defineProperty('nsfw', {
        type: Number,
        dataType: 'tinyint',
        default: 0
    });

    Model.observe('before save', function beforeUpdate(ctx, next) {
        if (ctx.instance) {
            ctx.instance.nsfw = hasNsfwWords(ctx.instance.text);
        } else {
            ctx.data.nsfw = hasNsfwWords(ctx.data.text);
        }
        next();
    });
};

/* jshint maxlen: 250 */
const RE = /\b(shit|piss|fuck|ass|cunt|bitch|whore|vagina|dick|asshole|clit|cum|faggot|fagot|fcuk|gay|nigga|motherfucker)/i;
/* jshint maxlen: 120 */

function hasNsfwWords(text) {
    if (RE.test(text)) {
        return 1;
    }
    return 0;
}