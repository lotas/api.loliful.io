[![build status](https://gitlab.com/lotask/kontra/badges/staging/build.svg)](https://gitlab.com/lotask/kontra/commits/staging)
[![build status](https://gitlab.com/lotask/kontra/badges/master/build.svg)](https://gitlab.com/lotask/kontra/commits/master)

# node.js
http://blog.risingstack.com/fundamental-node-js-design-patterns/
https://github.com/RisingStack/node-style-guide

http://stackoverflow.com/questions/10680601/nodejs-event-loop
http://www.sitepoint.com/10-tips-make-node-js-web-app-faster/

http://strong-pm.io/prod/

https://www.joyent.com/developers/node/design



# kontra

The project is based on [LoopBack](http://loopback.io).


## command line

### start project
`node .`
or
`npm run server`


### start composer&builder,etc
`slc arc`

### Modify models, properties, relationship
`slc loopback:model`
`slc loopback:property`


### Build client-side
`npm run build`

## Config

http://docs.strongloop.com/display/public/LB/Environment-specific+configuration


# User

## User login

	User.login({username: 'foo', password: 'bar'}, function(err, accessToken) {
	  console.log(accessToken);
	});

## User signup
### Disable signup:
disable registration: user.json:

    {
      "principalType": "ROLE",
      "principalId": "$everyone",
      "permission": “DENY",
      "property": "create"
    },

## Model hooks


    MyModel.observe('access', function limitToTenant(ctx, next) {
      ctx.query.where.tenantId = loopback.getCurrentContext().tenantId;
      next();
    });




# Docs & Examples:

## User management
https://github.com/strongloop/loopback-faq-user-management#how-do-you-register-a-new-user

## Angular admin
https://github.com/beeman/loopback-angular-admin

## Sample apps
https://github.com/strongloop-community/sample-applications

## node + nginx config
https://github.com/strongloop/strong-nginx-controller

## local reload
http://nodemon.io/

## Restrict remoting
https://github.com/Neil-UWA/loopback-remote-routing


## Running pm in production
https://strongloop.com/strongblog/node-js-process-manager-production/
https://strongloop.com/strongblog/node-js-deploy-production-best-practice/

	slc run --cluster 2


http://habrahabr.ru/post/270391/


## socket.io
http://socket.io/docs/
https://github.com/makersu/loopback-example-socket.io-chat

### Channels

*Private* user channel `user:${userId}`
*Messages*:
- `p:unread` unread notifications count
- `fresh` new nails


## ubuntu
https://www.digitalocean.com/community/tutorials/how-to-add-and-delete-users-on-an-ubuntu-14-04-vps

# Mongo

## Create user & database

```
	> mongo
	> use kontra
	> db.createCollection('log')
	> db.createUser({ user: "dev", pwd: "dev", roles: [{ role:"readWrite", db: "kontra"}]});
	> db.createUser({ user: "staging", pwd: "staging", roles: [{ role:"readWrite", db: "kontra"}]});
```

## long running operations
http://docs.mongodb.org/manual/reference/method/db.currentOp/

```
    db.currentOp()
    db.currentOp().inprog.forEach(
        function(op) {
            if(op.secs_running > 5) printjson(op);
        }
    )
```

## Iterate entities & update
```
db.notification.find().snapshot().forEach( function (ntf) {
    if (!ntf.data.nailId) {
        ntf.data.nailId = ntf.data.entityId || null;
        db.notification.save(ntf);
    }
});
```

## Automigrate!!
Create script for automigrate

# Social accounts
- https://developers.facebook.com/apps
    https://developers.facebook.com/apps/1014356928584078/dashboard/

- https://console.developers.google.com/project
  https://console.developers.google.com/project/kontra-1002/apiui/credential/oauthclient/211984216216-0phr0ahr3l8kaubgbov9230ih53v1tg5.apps.googleusercontent.com



# Redis

	brew install redis
	redis-server /usr/local/etc/redis.conf

# DB automigrate
http://docs.strongloop.com/display/public/LB/Creating+a+database+schema+from+models#Creatingadatabaseschemafrommodels-Auto-migrate


## Debug
https://github.com/RisingStack/trace-nodejs
https://docs.strongloop.com/display/public/LB/Setting+debug+strings

    DEBUG=loopback*,strong-remoting* npm run test


## Qeueus
https://github.com/Automattic/kue

## Testing
https://strongloop.com/strongblog/nodejs-testing-documenting-apis-mocha-acquit/
http://www.clock.co.uk/blog/tools-for-unit-testing-and-quality-assurance-in-node-js
https://medium.com/@tomastrajan/proper-testing-of-angular-js-applications-with-es6-modules-8cf31113873f



## Model : Scope : Fields
https://docs.strongloop.com/display/public/LB/Model+definition+JSON+file#ModeldefinitionJSONfile-Excludepropertiesfrombasemodel



### node.js

    nvm install 6
    nvm alias default 6
    nvm use default

    npm install -g pm2
    pm2 restart 0

### Mongo 2.6 -> 3.2
https://docs.mongodb.org/manual/tutorial/transparent-huge-pages/
http://askubuntu.com/questions/643252/how-to-migrate-mongodb-2-6-to-3-0-with-wiredtiger


### AWS-S3:

    $ cp server/aws.json.dist server/aws.json
    $ vim ..



# Security
https://strongloop.com/strongblog/best-practices-for-express-in-production-part-one-security/

Node security project:

    npm i -g nsp
    nsp check


RequireSafe

    npm i -g requiresafe
    requiresafe check

Retire

    npm i -g retire
    retire


