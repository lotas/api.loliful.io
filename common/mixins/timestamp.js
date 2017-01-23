var debug = require('debug')('kontra:mixin:updateable');

/**
 * Update *updated*, *created* date field when record is being saved
 */
module.exports = function(Model) {

    // give each dog a unique tag for tracking
    Model.defineProperty('updated', {
        type: Date
    });
    Model.defineProperty('created', {
        type: Date,
        required: true,
        defaultFn: 'now'
    });


    Model.observe('before save', function beforeUpdate(ctx, next) {
        if (ctx.options && ctx.options.skipUpdatedAt) {
            return next();
        }

        if (ctx.instance) {
            ctx.instance.updated = new Date();
        } else {
            ctx.data.updated = new Date();
        }
        next();
    });
};

