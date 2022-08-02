function (user, context, callback) {
  var count = context.stats && context.stats.loginsCount ? context.stats.loginsCount : 0;
  if (count > 1) {
    return callback(null, user, context);
  }

  var ManagementClient = require('auth0@2.17.0').ManagementClient;
  var management = new ManagementClient({
    token: auth0.accessToken,
    domain: auth0.domain
  });

  management.assignRolestoUser(
    { id : user.user_id}, 
    { "roles" :["InsertRoleIDHere"]}, // Any new user receives "Unassigned New User" role
    function (err) {
      if (err) {
        console.log('Error assigning role: ' + err);
      }    
      callback(null, user, context);
  });
}