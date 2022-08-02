function (user, context, callback) {
  var requestedScopes = context.request.body.scope || context.request.query.scope;
  var filteredScopes = requestedScopes.split(' ').filter( function(x) {
    return x.indexOf(':') < 0;
  });

  // user name
  context.accessToken['DOMAIN_GOES_HERE/username'] = user.nickname;

  // and email
  context.accessToken.custom_email = user.email;
  // test
  context.accessToken['DOMAIN_GOES_HERE/email'] = user.email;

  callback(null, user, context);
}