var apiErrors = require('./api-errors');
var debug = require('debug')('kontra:model-helper');

module.exports = {
    ensureAuth: ensureAuth,
    parsePage: parsePage,
    parseLimit: parseLimit,
    whitelistModelMethods: whitelistModelMethods
};

function ensureAuth(ctx, unused, next) {
    if (ctx.req.accessToken) {
        next();
    } else {
        next(apiErrors.authRequired());
    }
}


/**
 * Normalize limit, page vars
 */
function parsePage(page, max) {
    max = max || 9999;
    page = parseInt(page);

    if (isNaN(page) || page > max || page < 1) {
        page = 1;
    }
    return page;
}

/**
 * Normalize limit, page vars
 */
function parseLimit(limit, max) {
    max = max || 100;
    limit = parseInt(limit);

    if (isNaN(limit) || limit > max || limit < 0) {
        limit = 20;
    }

    return limit;
}

/**
 * Whitelist model methods
 */
function whitelistModelMethods(model, methodsToExpose) {
    if (model && model.sharedClass) {
        methodsToExpose = methodsToExpose || [];

        var modelName = model.sharedClass.name;
        var methods = model.sharedClass.methods();
        var relationMethods = [];
        var hiddenMethods = [];

        try {
            Object.keys(model.definition.settings.relations).forEach(function (relation) {
                relationMethods.push({name: '__findById__' + relation, isStatic: false});
                relationMethods.push({name: '__destroyById__' + relation, isStatic: false});
                relationMethods.push({name: '__updateById__' + relation, isStatic: false});
                relationMethods.push({name: '__exists__' + relation, isStatic: false});
                relationMethods.push({name: '__link__' + relation, isStatic: false});
                relationMethods.push({name: '__get__' + relation, isStatic: false});
                relationMethods.push({name: '__create__' + relation, isStatic: false});
                relationMethods.push({name: '__update__' + relation, isStatic: false});
                relationMethods.push({name: '__destroy__' + relation, isStatic: false});
                relationMethods.push({name: '__unlink__' + relation, isStatic: false});
                relationMethods.push({name: '__count__' + relation, isStatic: false});
                relationMethods.push({name: '__delete__' + relation, isStatic: false});
            });
        } catch (err) {
            debug(err);
        }

        methods.concat(relationMethods).forEach(function (method) {
            var methodName = method.name;
            if (methodsToExpose.indexOf(methodName) < 0) {
                hiddenMethods.push(methodName);
                model.disableRemoteMethod(methodName, method.isStatic);
            }
        });

        if (hiddenMethods.length > 0) {
            debug('\nRemote mehtods hidden for', modelName, ':', hiddenMethods.join(', '), '\n');
        }
    }
}
