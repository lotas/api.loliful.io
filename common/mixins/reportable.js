var debug = require('debug')('kontra:mixin:reportable');
var minAbuseCount = require('../../server/config').minAbuseCount;
var appEvents = require('../../server/lib/app-events');

/**
 * Initial fix
 *
 * UPDATE user a set countReported = (select SUM(reported) from nail n WHERE n.userId=a.id)
 * UPDATE user a set countReported = countReported + (select SUM(reported) from hammer h WHERE h.userId=a.id)
 *
 *
 * @param Model
 * @param options
 */
module.exports = function(Model, options) {

    Model.defineProperty('reported', {
        type: Number,
        default: 0
    });

    // static version
    Model.report = function(id, cb) {
        Model.findById(id, function(err, obj) {
            if (err) return cb(err);
            reportAbuse(obj, cb);
        });
    };

	Model.prototype.report = function(cb) {
        reportAbuse(this, cb);
    };

	/**
	 *  Vote for a given object
	 */
	function reportAbuse(obj, cb) {
        if (!obj.reported) {
            obj.reported = 0;
        }

        obj.reported++;
        obj.updateAttribute('reported', obj.reported, function(err, res) {
            if (err) return cb(null, false);
            cb(null, true);
        });

        if (obj.reported === minAbuseCount) {
            debug(
                'Model [%s] "%s" was reported again %d',
                obj.id,
                obj.text,
                obj.reported
            );

            Model.app.models.Email.send({
                to: 'abusek@loliful.io',
                from: 'hello@loliful.io',
                subject: `New abuse report! ${obj.id}`,
                text: `
id: ${obj.id}
${obj.text}

https://app.loliful.io/nail/${obj.nailId || obj.id}
`
            });
        }

        appEvents.emit(appEvents.EVENTS.REPORT_ABUSE, {
            'id': obj.id,
            'text': obj.text,
            'reportedCount': obj.reported
        });

        Model.app.models.user.findById(obj.userId, function(err, user) {
            if (err) return debug(err);

            if (user) {
                user.countReported++;
                user.updateAttribute('countReported', user.countReported);
            }
        });
    }

	Model.remoteMethod('report', {
        isStatic: false,
		description: 'Report abuse',
		returns: {arg: 'success', type: 'boolean'},
		http: {path: '/report', verb: 'POST'}
	});
};
