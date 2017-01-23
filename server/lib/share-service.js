/* jshint maxlen: 500 */

var exec = require('child_process').execFile;
var path = require('path');
var fs = require('fs');
var AWS = require('aws-sdk');
var escapeHtml = require('escape-html');

var debug = require('debug')('kontra:ShareService');

var config = require('../config.js');
var appEvents = require('./app-events');
var apiErrors = require('./api-errors');

AWS.config.loadFromPath(path.join(__dirname, '../aws.json'));
var s3 = new AWS.S3({
    params: {
        Bucket: config.s3.bucket
    }
});

var models;

var service = {
    setModels: setModels,
    findOrGenerateShare: findOrGenerateShare,
    getGradientNum: getGradientNum,
    _createShareObject: createShareObject,
    _persistShareObject: persistShareObject,
    _getParsedCardHtmlTemplate: getParsedCardHtmlTemplate,
    _renderCardImage: renderCardImage,
    _distributeCard: distributeCard,
    _updateImageUrl: updateImageUrl,
    _getShareObjectMock: _getShareObjectMock,
    _cleanupShareTempFiles: cleanupShareTempFiles,

    addShareClick: addShareClick
};

module.exports = service;

/**
 *
 * @param appModels
 */
function setModels(appModels) {
    models = appModels;
}

/**
 *
 * @param {int|null} nailId
 * @param {int|null} hammerId
 * @returns {Promise}
 */
function findOrGenerateShare(nailId, hammerId) {
    return new Promise((resolve, reject) => {
        models.share.findOne({
            where: {
                nailId: nailId,
                hammerId: hammerId
            }
        }, (err, share) => {
            if (err) {
                debug(`Fetching share for nail:${nailId} hammer:${hammerId}`, err);
                return reject(err);
            }

            if (share && share.img) {
                // increase clicks count
                share.sharedCount++;
                share.save(function(err) {
                    if (err) {
                        debug('Error updating sharedCount', err);
                    }
                });

                return resolve(share);
            }

            // create share object
            service._createShareObject(nailId, hammerId) // returns shareObject
                .then(service._persistShareObject)
                .then(service._getParsedCardHtmlTemplate)
                .then(service._renderCardImage)
                .then(service._distributeCard)
                .then(service._updateImageUrl)
                .then(shareObject => {

                    resolve(shareObject);

                    cleanupShareTempFiles(shareObject);

                    appEvents.emit(appEvents.EVENTS.NEW_CARD, {
                        'img': shareObject.img
                    });
                })
                .catch(errObj => {
                    reject(errObj);
                });
        });
    });
}

/**
 * Save share object without generated image
 *
 * @param shareObject
 * @returns {Promise}
 */
function persistShareObject(shareObject) {
    return new Promise((resolve, reject) => {
        models.share.create({
            nailId: shareObject.nailId,
            hammerId: shareObject.hammerId,
            nailAuthorId: shareObject.nailAuthorId,
            hammerAuthorId: shareObject.hammerAuthorId,
            img: '[generating]',
            data: {
                nailAuthor: shareObject.nailAuthorId ? shareObject.$nail.$user.name : '',
                hammerAuthor: shareObject.hammerAuthorId ? shareObject.$hammer.$user.name : '',
                nailText: shareObject.$nail ? shareObject.$nail.text : '',
                hammerText: shareObject.$hammer ? shareObject.$hammer.text : ''
            },
            sharedCount: 1,
            sharedClicks: 0
        }, (err, data) => {
            if (err) {
                debug('Error persisting share object', err);
                return reject(apiErrors.exception(err));
            }

            shareObject.id = data.id;

            resolve(shareObject);
        });
    });
}

function updateImageUrl(shareObject) {
    return new Promise((resolve, reject) => {
        models.share.updateAll({
            id: shareObject.id
        }, {
            img: shareObject.img
        }, function(err) {
            if (err) {
                debug('Cannot update nail.countVotes', err);
                return reject(apiErrors.exception(err));
            }

            resolve(shareObject);
        });
    });
}

/**
 * Generate share object from nail
 */
function createShareObject(nailId, hammerId) {
    return new Promise((resolve, reject) => {
        var shareObject = {
            nailId: nailId,
            $nail: null,
            nailAuthorId: null,
            hammerId: hammerId,
            $hammer: null,
            hammerAuthorId: null
        };

        var promiseNail = new Promise((resolveA, rejectA) => {
            if (nailId) {
                models.nail.findById(nailId, (err, nail) => {
                    if (err || !nail) {
                        debug('error finding nail', err);
                        return resolveA();
                    }

                    shareObject.$nail = nail;
                    shareObject.nailAuthorId = nail.userId;
                    resolveA();
                });
            } else {
                resolveA();
            }
        });
        var promiseHammer = new Promise((resolveB, rejectB) => {
            if (hammerId) {
                models.hammer.findById(hammerId, (err, hammer) => {
                    if (err || !hammer) {
                        debug('error finding hammer', err);
                        return resolveB();
                    }

                    shareObject.$hammer = hammer;
                    shareObject.hammerAuthorId = hammer.userId;
                    resolveB();
                });
            } else {
                resolveB();
            }
        });

        // attach main entities, then authors
        Promise.all([promiseHammer, promiseNail])
            .then(() => {
                if (!shareObject.$nail && !shareObject.$hammer) {
                    return reject(apiErrors.notFound());
                }

                models.nail.attachUserNames([shareObject])
                    .then(items => {
                        resolve(items[0]);
                    })
                    .catch(err => {
                        debug('Cannot attach usernames', err);
                        reject(apiErrors.exception(err.message, 500));
                    });
            });
    });
}

/**
 * Generate share object from hammer + nail
 */
function createNewShare(hammerId, req, res, next) {
    models.hammer.findById(hammerId, (err, object) => {
        if (err || !object) {
            return res.json(false);
        }

        req.hammer = object;

        models.nail.findById(object.nailId, (err, nail) => {
            if (err || !nail) {
                debug('Nail not found for nailId: ' + object.nailId);
                return res.sendStatus(404);
            }

            req.nail = nail;
            var shareObject = {
                $hammer: req.hammer,
                hammerAuthorId: req.hammer.userId,
                $nail: req.nail,
                nailAuthorId: req.nail.userId,
                question: req.nail.text,
                answer: req.hammer.text
            };

            models.hammer.attachUserNames([shareObject])
                .then(items => {
                    req.shareObject = items[0];
                    next();
                })
                .catch(err => {
                    debug('Cannot attach usernames', err);
                    res.sendStatus(500);
                });
        });

    });
}

function cleanupShareTempFiles(shareObject) {
    debug(`Unlinking ${shareObject.$html}, ${shareObject.$tmpFile}`);
    fs.unlink(shareObject.$html, debugCallback);

    //distribute funciton moves it to a new location
    //fs.unlink(shareObject.$tmpFile, debugCallback);

    function debugCallback(err) {
        if (err) {
            debug(err);
        }
    }
}

/**
 * @param {Object} shareObject
 * @return {Promise}
 */
function getParsedCardHtmlTemplate(shareObject) {
    var templatePath = path.join(config.paths.public, '/share/card.html');
    var tempFilePath = path.join(config.paths.public, `/share/card-${shareObject.id}.html`);

    return new Promise((resolve, reject) => {
        fs.readFile(templatePath, (err, html) => {
            if (err) {
                debug('Cannot read card template', err);
                return reject(err);
            }
            // TODO: add ejs/jade templates
            html = String(html);
            html = html.replace (/(%[a-zA-Z]+%)/ig, function(match) {
                switch (match) {
                    case '%AuthorSeparator%':
                        return shareObject.hammerAuthorId && shareObject.nailAuthorId ?
                            '<b>&</b>' : '';
                    case '%NailAuthor%':
                        return shareObject.nailAuthorId ?
                            escapeHtml(shareObject.$nail.$user.name) : '';
                    case '%HammerAuthor%':
                        return shareObject.hammerAuthorId ?
                            escapeHtml(shareObject.$hammer.$user.name) : '';
                    case '%NailText%':
                        return shareObject.$nail ?
                            escapeHtml(shareObject.$nail.text).replace(/[\r\n]+-/g, '<br>-') : '';
                    case '%HammerText%':
                        return shareObject.$hammer ?
                            escapeHtml(shareObject.$hammer.text).replace(/^-/, '<br>-') : '';
                    case '%GradientNum%':
                        return getGradientNum(shareObject);
                }
                return '';
            });

            shareObject.$html = tempFilePath;
            debug(`Writing temp card file ${tempFilePath}`);
            fs.writeFile(tempFilePath, html, function(errWrite) {
                if (errWrite) {
                    debug('Cannot write temp file', tempFilePath);
                    return reject(errWrite);
                }
                resolve(shareObject);
            });
        });
    });
}

/**
 * @param {Object} shareObject
 * @return {Promise}
 */
function renderCardImage(shareObject) {
    shareObject.$fileName = `${shareObject.id}.png`;
    shareObject.$tmpFile = path.join(config.paths.tmp, shareObject.$fileName);

    return new Promise((resolve, reject) => {
        debug(`Generating ${shareObject.$fileName}`);

        if (config.isTesting) {
            debug('Skipping rendering in testing env');
            fs.writeFile(shareObject.$tmpFile, '[testing]', function(err) {
                if (err) {
                    return reject(err);
                }
                resolve(shareObject);
            });
            return;
        }

        exec(config.paths.phantomJs, [
                path.join(config.paths.server, '/scripts/render-image.js'),
                shareObject.$html,
                shareObject.$tmpFile
            ], {
                timeout: 30000
            },
            function(error, stdout, stderr) {
                if (error) {
                    debug('Error createing img: ', error, stdout, stderr);
                    return reject(apiErrors.exception(error));
                }
                debug('Generation done');
                resolve(shareObject);
            });
    });
}

/**
 * Depending on current strategy:
 * Copy to cards folder / upload to S3 / somewhere else
 * @param shareObject
 */
function distributeCard(shareObject) {
    if (config.s3.enabled) {
        return uploadFileToS3(shareObject);
    }

    return copyToCardsFolder(shareObject);
}

/**
 * Upload file plus set public-read permissions
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
 *
 * @param  {Object} shareObject
 * @return {Promise}
 */
function uploadFileToS3(shareObject) {
    return new Promise((resolve, reject) => {
        var fileStream = fs.createReadStream(shareObject.$tmpFile);

        debug(`Uploading ${shareObject.$fileName} to S3`);
        s3.putObject({
            Bucket: config.s3.bucket,
            Key: shareObject.$fileName,
            Body: fileStream,
            ContentType: 'image/png',
            ACL: 'public-read',
            Expires: Date.now() + 14688000, // 180 days
            CacheControl: 'max-age=14688000, public'
        }, (err, data) => {
            if (err) {
                debug(err);
                return reject(err);
            }
            debug('Upload successful', data);

            shareObject.img = `https://s3.amazonaws.com/${config.s3.bucket}/${shareObject.$fileName}`;
            resolve(shareObject);
        });
    });
}

function copyToCardsFolder(shareObject) {
    return new Promise((resolve, reject) => {
        fs.rename(shareObject.$tmpFile, path.join(config.paths.cards, shareObject.$fileName), (err, res) => {
            if (err) {
                debug('Cannot move file', err);
                return reject(err);
            }
            shareObject.img = `http://cards.loliful.io/${shareObject.$fileName}`;
            resolve(shareObject);
        });
    });
}


function _getShareObjectMock() {
    let shareObject = {
        id: 1,
        nailId: 2,
        $nail: {
            id: 2,
            $user: {
                id: 3,
                name: 'Test1'
            },
            text: 'NailText'
        },
        nailAuthorId: 3,
        hammerId: 4,
        $hammer: {
            id: 4,
            $user: {
                id: 5,
                name: 'Test2'
            },
            text: 'HammerText'
        },
        hammerAuthorId: 5,
        img: ''
    };

    return shareObject;
}

/**
 * Gradient # should be always the same
 *
 * @param shareObject
 * @returns {number}
 * @private
 */
function getGradientNum(shareObject) {
    return shareObject.id % 10 + 1;
}

/**
 * Add a new shareClick entry
 *
 * @param shareId
 * @param userId
 * @param network
 */
function addShareClick(shareId, userId, network) {
    return new Promise((resolve, reject) => {
        models.share.findById(shareId, (err, share) => {
            if (err) {
                debug(err, shareId, userId, network);
                return reject(err);
            }

            if (!share) {
                return reject();
            }

            // update sharedClicks
            share.sharedClicks++;
            share.updateAttribute('sharedClicks', share.sharedClicks);

            models.shareClick.create({
                shareId: shareId,
                userId: userId,
                network: network
            }, function(err, item) {
                if (err) {
                    debug(err);
                    return reject(err);
                }
                resolve(item);
            });
        });
    });
}
