// https://community.auth0.com/t/accessing-the-permissions-array-in-the-access-token/27559/10
function (user, context, callback) {
  let namespace = 'AUTHO-NAMESPACE-GOES-HERE'; // configuration.NAMESPACE
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