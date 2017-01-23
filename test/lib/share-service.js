/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var loopback = require('loopback');
var fs = require('fs');
var shareService = require('../../server/lib/share-service');

describe('ShareService', function() {

    var dataSource;
    var shareModel;
    var shareClickModel;

    before(function() {
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        shareModel = loopback.createModel('share', {
            id: Number,
            nailId: Number,
            hammerId: Number,
            nailAuthorId: Number,
            hammerAuthorId: Number,
            img: String,
            data: Object,
            sharedCount: Number,
            sharedClicked: Number,
            openedCount: Number
        });
        shareModel.attachTo(dataSource);

        shareClickModel = loopback.createModel('shareClick', {
            id: Number,
            shareId: Number,
            userId: Number,
            network: String,
            created: Date
        });
        shareClickModel.attachTo(dataSource);
    });

    beforeEach(function() {
        shareService.setModels({
            share: shareModel,
            shareClick: shareClickModel
        });
    });


    it('should have public interface', function(cb) {
        shareService.setModels.should.be.instanceOf(Function);
        shareService.findOrGenerateShare.should.be.instanceOf(Function);
        cb();
    });

    describe('_persistShareObject', function() {
        it('should save into storage', function(cb) {
            let shareObject = shareService._getShareObjectMock();

            shareService._persistShareObject(shareObject)
                .then(function(shareObject2) {
                    shareObject2.id.should.be.instanceOf(Number);

                    cb();
                })
                .catch(cb);
        });
    });
    describe('_updateImageUrl', function() {
        it('update url in storage', function(cb) {
            let shareObject = shareService._getShareObjectMock();

            shareService._persistShareObject(shareObject)
                .then(function(shareObject2) {
                    shareObject2.img = 'new-url';

                    shareService._updateImageUrl(shareObject2)
                        .then(function(shareObject3) {
                            shareObject3.img.should.be.equal(shareObject2.img);
                            cb();
                        })
                        .catch(cb);
                })
                .catch(cb);
        });
    });

    describe('_createShareObject', function() {

    });
    describe('_getParsedCardHtmlTemplate', function() {
        it('should substitute placeholders', function(cb) {
            let shareObject = shareService._getShareObjectMock();

            shareService._getParsedCardHtmlTemplate(shareObject)
                .then(function(shareObject) {
                    fs.readFile(shareObject.$html, 'utf8', function(err, data) {
                        if (err) return cb(err);

                        data.should.containEql(`grad-${shareService.getGradientNum(shareObject)}`);
                        data.should.containEql('adjust-font-size.js');
                        data.should.containEql('<div class="card-stars"></div>');

                        data.should.containEql(shareObject.$nail.text);
                        data.should.containEql(shareObject.$hammer.text);
                        data.should.containEql(shareObject.$nail.$user.name);
                        data.should.containEql(shareObject.$hammer.$user.name);

                        shareService._cleanupShareTempFiles(shareObject);

                        cb();
                    });
                })
                .catch(cb);
        });
    });
    describe('_renderCardImage', function() {

    });
    describe('_distributeCard', function() {

    });

    describe('findOrGenerateShare', function() {

    });

    describe('getGradientNum', function() {
        it('should always return the same num', function() {
            should.equal(shareService.getGradientNum({id: 3}), 4);
            should.equal(shareService.getGradientNum({id: 8}), 9);
        });
        it('should return expected numbers', function() {
            should.equal(shareService.getGradientNum({id: 1}), 2);
            should.equal(shareService.getGradientNum({id: 30}), 1);
            should.equal(shareService.getGradientNum({id: 1052}), 3);
        });
    });

    describe('addShareClick', function() {
        it('should save entry', function(cb){
            shareModel.create({
                nailId: 1,
                hammerId: 2,
                img: 'url'
            }, function(err, shareItem) {
                if (err) return cb(err);

                shareService.addShareClick(shareItem.id, 444, 'fb')
                    .then(function(item) {
                        shareClickModel.findById(item.id, function(err, click) {
                            if (err) return cb(err);

                            should.equal(click.shareId, shareItem.id);
                            should.equal(click.userId, 444);
                            should.equal(click.network, 'fb');

                            cb();
                        });
                    })
                    .catch(cb);
            });

        });
    });
});
