var lt = require('loopback-testing');
var assert = require('assert');
var loopback = require('loopback');
var app = require('../server/server.js'); //path to app.js or server.js

// describe('nail', function() {
//   lt.beforeEach.withApp(app);
//   lt.describe.whenCalledRemotely('GET', '/nails', function() {
//     lt.it.shouldBeAllowed();
//     it('should have statusCode 200', function() {
//       assert.equal(this.res.statusCode, 200);
//     });

//     lt.beforeEach.givenModel('nail');
//     it('should respond with an array of nails', function() {
//       assert(Array.isArray(this.res.body));
//     });
//   });
// });

describe('models', function() {
  var Nail;

  beforeEach(function(){
    var ds = loopback.createDataSource({
      connector: loopback.Memory
    });
    Nail = app.models.Nail;
    Nail.attachTo(ds);
  });

  it('should have nail model', function() {
      assert(app.models.nail);
  });
  it('nail model is votable', function() {
    // console.log(Nail);
      assert.equal(typeof Nail.vote, 'function');
  });

  it('should have nail hammer', function() {
      assert(app.models.hammer);
  });
  it('hammer model is votable', function() {
      assert.equal(typeof app.models.hammer.vote, 'function');
  });

  it('should have votes', function() {
      assert(app.models.votes);
  });

});


// describe('routes', function() {
//   lt.beforeEach.withApp(app);
//   lt.describe.whenCalledRemotely('GET', '/top', function() {
//     lt.it.shouldBeAllowed();
//     it('should have statusCode 200', function() {
//       assert.equal(this.res.statusCode, 200);
//     });

//     lt.beforeEach.givenModel('nail');
//     it('should respond with an array of nails', function() {
//       assert(this.res.body.length > 0);
//     });
//   });
// });