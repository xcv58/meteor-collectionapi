[![Build Status](https://travis-ci.org/xcv58/meteor-collectionapi.svg)](https://travis-ci.org/xcv58/meteor-collectionapi)

This package is forked from [crazytoad/meteor-collectionapi](https://github.com/crazytoad/meteor-collectionapi)

Table of Contents
=================
  * [Collection API](#collection-api)
  * [Installation](#installation)
  * [Quick Setup](#quick-setup)
  * [Using the API](#using-the-api)
    * [API Usage Example](#api-usage-example)
  * [Advanced Features](#advanced-features)
    * [Handle all requests by yourself](#handle-all-requests-by-yourself)
    * [Custom Authenticate Function](#custom-authenticate-function)

Collection API
========

Easily perform [CRUD](http://en.wikipedia.org/wiki/Create,_read,_update_and_delete) operations on Meteor Collections over HTTP/HTTPS from outside of the Meteor client or server environment.


Current version: 0.2.5  ***(Requires Meteor v1.0.3.2+)***

***Warning: versions 0.1.18+ are not compatible with versions less than 0.1.18 if you use before functions!***
Because we change the before functions call parameters.

Installation
-------

Just run this in your app:

    $ meteor add xcv58:collection-api

It's that easy! Be sure to check out other cool packages over at [Atmosphere](https://atmosphere.meteor.com/).


Quick Setup
-------

```javascript
Players = new Meteor.Collection("players");

if (Meteor.isServer) {
  Meteor.startup(function () {

    // All values listed below are default
    collectionApi = new CollectionAPI({
      authToken: undefined,              // Require this string to be passed in on each request
      apiPath: 'collectionapi',          // API path prefix
      standAlone: false,                 // Run as a stand-alone HTTP(S) server
      allowCORS: false,                  // Allow CORS (Cross-Origin Resource Sharing)
      sslEnabled: false,                 // Disable/Enable SSL (stand-alone only)
      listenPort: 3005,                  // Port to listen to (stand-alone only)
      listenHost: undefined,             // Host to bind to (stand-alone only)
      privateKeyFile: 'privatekey.pem',  // SSL private key file (only used if SSL is enabled)
      certificateFile: 'certificate.pem', // SSL certificate key file (only used if SSL is enabled)
      timeOut: 120000
    });

    // Add the collection Players to the API "/players" path
    collectionApi.addCollection(Players, 'players', {
      // All values listed below are default
      authToken: undefined,                   // Require this string to be passed in on each request.
      authenticate: undefined, // function(token, method, requestMetadata) {return true/false}; More details can found in [Authenticate Function](#Authenticate-Function).
      methods: ['POST','GET','PUT','DELETE'],  // Allow creating, reading, updating, and deleting
      before: {  // This methods, if defined, will be called before the POST/GET/PUT/DELETE actions are performed on the collection.
                 // If the function returns false the action will be canceled, if you return true the action will take place.
        POST: undefined,    // function(obj, requestMetadata, returnObject) {return true/false;},
        GET: undefined,     // function(objs, requestMetadata, returnObject) {return true/false;},
        PUT: undefined,     // function(obj, newValues, requestMetadata, returnObject) {return true/false;},
        DELETE: undefined   // function(obj, requestMetadata, returnObject) {return true/false;}
      },
      after: {  // This methods, if defined, will be called after the POST/GET/PUT/DELETE actions are performed on the collection.
                // Generally, you don't need this, unless you have global variable to reflect data inside collection.
                // The function doesn't need return value.
        POST: undefined,    // function() {console.log("After POST");},
        GET: undefined,     // function() {console.log("After GET");},
        PUT: undefined,     // function() {console.log("After PUT");},
        DELETE: undefined   // function() {console.log("After DELETE");},
      }
    });

    // Starts the API server
    collectionApi.start();
  });
}
```

Note that requestMetadata is a JSONObject that contains
```collectionPath```, ```collectionId```, ```fields```, and ```query``` from request.
Some values may be ```undefined``` if request doesn't have such parts.

```bash
curl http://localhost:3000/collectionapi/players/id/field/subfield?query1=1&query2=2 -d '{"a" : 1}'
```

```javascript
 requestMetadata = {
    collectionPath: 'players',
    collectionId: 'id',
    fields: [ 'field', 'subfield' ],
    query: {
      query1: '1',
      query2: '2'
    }
  }
```

Using the API
-------

If you specify an `authToken` it must be passed in either the `X-Auth-Token` request header or as an `auth-token` param in the query string.


### API Usage Example

If you already did [Quick Setup](#quick-setup) part, please ignore the setup code snippet below:

```javascript
Players = new Meteor.Collection("players");

if (Meteor.isServer) {
  Meteor.startup(function () {
    collectionApi = new CollectionAPI({ authToken: '97f0ad9e24ca5e0408a269748d7fe0a0' });
    collectionApi.addCollection(Players, 'players');
    collectionApi.start();
  });
}
```

Get all of the player records:

    $ curl -H "X-Auth-Token: 97f0ad9e24ca5e0408a269748d7fe0a0" http://localhost:3000/collectionapi/players

Get an individual record:

    $ curl -H "X-Auth-Token: 97f0ad9e24ca5e0408a269748d7fe0a0" http://localhost:3000/collectionapi/players/c4acddd1-a504-4212-9534-adca17af4885

Create a record:

    $ curl -H "X-Auth-Token: 97f0ad9e24ca5e0408a269748d7fe0a0" -d "{\"name\": \"John Smith\"}" http://localhost:3000/collectionapi/players

Update a record:

    $ curl -H "X-Auth-Token: 97f0ad9e24ca5e0408a269748d7fe0a0" -X PUT -d "{\"\$set\":{\"gender\":\"male\"}}" http://localhost:3000/collectionapi/players/c4acddd1-a504-4212-9534-adca17af4885

With this parameter: ```?callback=0``` it will return a JSONObject like ```{status: success}``` instead of updated record:

    $ curl -H "X-Auth-Token: 97f0ad9e24ca5e0408a269748d7fe0a0" -X PUT -d "{\"\$set\":{\"gender\":\"male\"}}" http://localhost:3000/collectionapi/players/c4acddd1-a504-4212-9534-adca17af4885?callback=0

Delete a record:

    $ curl -H "X-Auth-Token: 97f0ad9e24ca5e0408a269748d7fe0a0" -X DELETE http://localhost:3000/collectionapi/players/c4acddd1-a504-4212-9534-adca17af4885

Advanced Features
-------

### Handle all requests by yourself
~~The use case is only for that you want to handle POST request by yourself and **don't allow all other requests**.~~

**The ```v0.2.1+``` expose an JSONObject ```returnObject```, which can take some information back to package, then return to user.**

The ```returnObject``` look like this:

```javascript
  var returnObject = {
    success: false,
    statusCode : undefined,
    body: undefined
  };
```

If you really want to handle requests by yourself, you need always ```return true```,
and set ```returnObject.success = true;```,
then properly set ```statusCode``` and ```body```.

But you need maintain your **Collection(s) manually**, don't, never forget this!

There is a simple demo to for handle all requests in application level.

It uses ```_del``` to indicate whether a record was deleted, so you would never lose any data:
https://github.com/xcv58/meteor-collectionapi-demo/blob/cf233f31d973191e6cd4510ed5e017ad695b33f8/server/restful.js#L36

But nothing comes for free, you may face some performance issue.
You can move deleted records to another collection, if performance does matter.

---

Example for handle POST:

```javascript
        POST: function(obj, requestMetadata, returnObject) {
          var hasId = obj.hasOwnProperty('id');
          if (hasId) {
            // insert obj to your collection!
            returnObject.success = true;
            returnObject.statusCode = 201;
            returnObject.body = {
              method: 'POST',
              obj: obj
            };
          } else {
            returnObject.success = true;
            returnObject.statusCode = 500;
            returnObject.body = {error: 'no id'};
          }
          return true;
        }
```

---

Below is for ```v0.2.0``` to handle ```POST``` request:

For example, you want to split one API path requests to different Collections, the package can't do this.
But you can solve it in application level.
You should use below code to tell package don't do anything about the passed Collection.
That's why **all other requests doesn't support** yet: the passed Collection (Players) doesn't have any data.

```javascript
Players = new Meteor.Collection("players");

if (Meteor.isServer) {
  Meteor.startup(function () {

    // All values listed below are default
    collectionApi = new CollectionAPI({
      authToken: undefined,              // Require this string to be passed in on each request
      apiPath: 'collectionapi',          // API path prefix
      standAlone: false,                 // Run as a stand-alone HTTP(S) server
      allowCORS: false,                  // Allow CORS (Cross-Origin Resource Sharing)
      sslEnabled: false,                 // Disable/Enable SSL (stand-alone only)
      listenPort: 3005,                  // Port to listen to (stand-alone only)
      listenHost: undefined,             // Host to bind to (stand-alone only)
      privateKeyFile: 'privatekey.pem',  // SSL private key file (only used if SSL is enabled)
      certificateFile: 'certificate.pem', // SSL certificate key file (only used if SSL is enabled)
      timeOut: 120000
    });

    // Add the collection Players to the API "/players" path
    collectionApi.addCollection(Players, 'players', {
      // All values listed below are default
      authToken: undefined,                   // Require this string to be passed in on each request
      methods: ['POST'],  // Allow creating, reading, updating, and deleting
      before: {  // This methods, if defined, will be called before the POST/GET/PUT/DELETE actions are performed on the collection.
                 // If the function returns false the action will be canceled, if you return true the action will take place.
        POST: undefined,    // function(obj, requestMetadata, returnObject) {do everything you wanna; returnObject.success = true; returnObject.statusCode = 201; returnObject.body = {"satus": "success"}; return true;},
        // You must return true and set returnObject.success = true, if you want to return the statusCode and body to client! If you return false it will works like ordinary api.
      },
      after: {  // This methods, if defined, will be called after the POST/GET/PUT/DELETE actions are performed on the collection.
                // Generally, you don't need this, unless you have global variable to reflect data inside collection.
                // The function doesn't need return value.
        POST: undefined,    // function() {console.log("After POST");},
      }
    });

    // Starts the API server
    collectionApi.start();
  });
}
```

### Custom Authenticate Function
Despite static authToken, you may need more flexible authenicate approach
that you can fully control.
So it comes!

You need implement the ```authenticate``` function in ```collectionApi.addCollection```:

```javascript
      authenticate: function(token, method, requestMetadata) {
        console.log("authen");
        console.log("token: " + token);
        console.log("method: " + method);
        console.log("requestMetadata: " + JSON.stringify(requestMetadata));
        if (token === undefined) {
          return false;
        }
        if (token === "97f0ad9e24ca5e0408a269748d7fe0a0") {
          return false;
        }
        return true;
      },
```

So the package can give all you need for authentication for every request.

You can authenticate by yourself,
such as allow all ```POST``` and ```GET``` requests even without a ```authToken```,
allow only ```PUT``` and ```DELETE``` requtests with valid ```authToken```.

Other use case may be combining the authentication with your existed user system,
so that you can assign unique permission for different users.

The arguments ```token```, ```method```, and ```requestMetadata``` represent
authen token client provide, request method, and JSONObject contains url metadata respectively.

For example, a request:

    $ curl  -H "X-Auth-Token: 97f0ad9e24ca5e0408a269748d7fe0a0" http://localhost:3000/collectionapi/players/id/a/b/c\?x\=1\&y\=2\&c\=3

should have output like:

```bash
I20150312-11:50:33.222(-4)? token: 97f0ad9e24ca5e0408a269748d7fe0a0
I20150312-11:50:33.222(-4)? method: GET
I20150312-11:50:33.222(-4)? requestMetadata: {"collectionPath":"players","collectionId":"id","fields":["a","b","c"],"query":{"x":"1","y":"2","c":"3"}}
```

**Note** that the ```authenticate function``` is optional, and the **```authToken```** you defined in
```new CollectionAPI``` or ```collectionApi.addCollection``` still work and have higher priority.

So the authentication is hierarchical system.
If you don't need global/static ```authToken```, just ignore them or set it to ```undefined```.
