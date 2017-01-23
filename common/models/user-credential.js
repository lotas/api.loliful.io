'use strict';

module.exports = function(UserCredential) {

    /*
     * Check if credentials already exist for a given provider and external id
     * Enable this hook if credentials can be linked only once
     *
     * @param Loopback context object
     * @param next middleware function
     * */
    UserCredential.observe('before save', function checkUserCredentials(ctx, next) {
        var shouldSkip = ctx.options && ctx.options.skipAfterSave;
        //new insert - see if it is used else where
        if (!shouldSkip && ctx.isNewInstance === true && ctx.instance) { //indicates a new insert
            var filter = {where: {provider: ctx.instance.provider, externalId: ctx.instance.externalId}};
            UserCredential.findOne(filter, function(err, userCredential) {
                if (err) return next(err);

                if (userCredential) {
                    err = new Error('Credentials already linked');
                    err.code = 'Validation Error';
                    err.statusCode = 422;
                    return next(err);
                } else {
                    //allow proceed
                    return next();
                }
            });
        } else {
            // don't allow updates on provider and external ID
            if (ctx.instance) {
                delete ctx.instance.externalId;
                delete ctx.instance.provider;
            } else if (ctx.data) {
                delete ctx.data.externalId;
                delete ctx.data.provider;
            }
            next();
        }
    });

    /*
     * Keep user identities in sync after saving a user-credential
     * It checks if a UserIdentityModel with the same provider and external ID exists
     * It assumes that the providername of userIdentity has suffix `-login`and of userCredentials has suffix `-link`
     *
     * @param Loopback context object
     * @param next middleware function
     * */
    UserCredential.observe('after save', function checkPassportUserIdentities(ctx, next) {
        if (ctx.options && ctx.options.skipAfterSave) return next();

        var data = JSON.parse(JSON.stringify(ctx.instance));

        delete data.id; // has to be auto-increment

        var userIdentity = UserCredential.app.models.userIdentity;
        var filter = {where: {provider: data.provider, externalId: data.externalId}};
        userIdentity.findOrCreate(filter, data, next);
    });

};
