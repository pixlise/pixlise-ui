# PIXLISE

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.1.1.

## Setting up & running

Your docker client will need to download built docker images that come from the PIXLISE project. Because it is now open-source these should be publicly available and you shouldn't need to log into a docker repository.

Now you can use our build-container (with all tools pre-installed) to run `genproto.sh` to generate the protobuf serialization code (from repo root):

`docker run --rm -v "$PWD":/usr/src/pixlise -w /usr/src/pixlise ghcr.io/pixlise/build-container:golang-1.18-protoc-3.7.1-protobuf-3.11.4-angular-13.1.2-nodejs-16 /bin/bash genproto.sh`

Next, install NPM packages:
`npm i`

Now to run it with the angular dev server:
`cd client`
`ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Auth0 Setup
The Auth0 account used is ok with mostly all defaults, but it does need a few specific configuration changes:
- Add the permissions the app needs. For a list of these, search for any code using AuthenticationService class's getIdTokenClaims$() function
- Add a "rule" to validate scopes, with the following code:
```
function (user, context, callback) {
  var permissions = user.permissions || ['some:thing'];
  var requestedScopes = context.request.body.scope || context.request.query.scope;
  var filteredScopes = requestedScopes.split(' ').filter( function(x) {
    return x.indexOf(':') < 0;
  });

  var allScopes = filteredScopes.concat(permissions);
  context.accessToken.scope = allScopes.join(' ');
  
  context.accessToken['https://namespace/customclaim'] = permissions;

  callback(null, user, context);
}
```
- Add a "rule" to return permissions in the id token, with the following code:
```
// https://community.auth0.com/t/accessing-the-permissions-array-in-the-access-token/27559/10
function (user, context, callback) {
  let namespace = 'https://pixlise.qut.edu.au/auth'; // configuration.NAMESPACE
  var map = require('array-map');
  var ManagementClient = require('auth0@2.17.0').ManagementClient;
  var management = new ManagementClient({
    token: auth0.accessToken,
    domain: auth0.domain
  });

  var params = { id: user.user_id, page: 0, per_page: 50, include_totals: true };
  management.getUserPermissions(params, function (err, permissions) {
    if (err) {
      // Handle error.
      console.log('err: ', err);
      callback(err);
    } else {
      var permissionsArr = map(permissions.permissions, function (permission) {
        return permission.permission_name;
      });
      context.idToken[namespace] = {
        permissions: permissionsArr
      };
    }
    callback(null, user, context);
  });
}
```
- Add a back-end API with the Audience: `pixlise-backend`

Make sure the environment.ts file used for building this Angular project has values that point it to the right Auth0 domain and PIXLISE backend endpoints.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Verbose build output

When shit hits the fan, this can turn on lots of build output for diagnosis:
`ng build --prod --named-chunks --verbose --build-optimizer=false --source-map >> buildoutput.txt`

## Documentation

We support `compodoc`. To generate documentation, install it first: `npm install -g "@compodoc/compodoc"` then run `compodoc` (no parameters needed, as it should pick up the .compodocrc.json configuration file) and open a browser to `http://localhost:8080/`