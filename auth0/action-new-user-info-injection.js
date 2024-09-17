const handleNewUserFlow = async (event, api) => {
  // Check if the user has a role assigned
  if (event.authorization && event.authorization.roles && event.authorization.roles.length > 0) {
    return;
  }

  // Create management API client instance
  const ManagementClient = require("auth0").ManagementClient;

  const management = new ManagementClient({
    domain: event.secrets.DOMAIN,
    clientId: event.secrets.CLIENT_ID,
    clientSecret: event.secrets.CLIENT_SECRET,
  });

  const params = { id: event.user.user_id };
  const data = { roles: ["rol_BDm6RvOwIGqxSbYt"] };

  try {
    await management.users.assignRoles(params, data);
  } catch (e) {
    console.log("New User Role Assignment Failed", e);
  }
};

const injectUserInfo = async (event, api) => {
  // Set user name
  api.accessToken.setCustomClaim("https://pixlise.org/username", event.user.name);

  // Set user email
  api.accessToken.setCustomClaim("custom_email", event.user.email);

  // Test: Set user email with different namespace
  api.accessToken.setCustomClaim("https://pixlise.org/email", event.user.email);
};

const injectPermissions = async (event, api) => {
  // Create management API client instance
  const ManagementClient = require("auth0").ManagementClient;

  const management = new ManagementClient({
    domain: event.secrets.DOMAIN,
    clientId: event.secrets.CLIENT_ID,
    clientSecret: event.secrets.CLIENT_SECRET,
  });

  const params = { id: event.user.user_id, page: 0, per_page: 50, include_totals: true };

  try {
    const permissions = await management.users.getPermissions(params);
    const permissionsArr = permissions.data.permissions.map((permission) => permission.permission_name);

    let namespace = "https://pixlise.qut.edu.au/auth";
    api.idToken.setCustomClaim(`${namespace}/permissions`, permissionsArr);
  } catch (err) {
    console.log("Error fetching user permissions:", err);
  }
};

exports.onExecutePostLogin = async (event, api) => {
  // Check if the user has a role assigned
  if (!event.authorization || !event.authorization.roles || event.authorization.roles.length <= 0) {
    await handleNewUserFlow(event, api);
  }

  if (!event.user.email_verified) {
    api.access.deny("Please verify your email by clicking the verify link that was emailed to you before logging in.");
  }

  await injectUserInfo(event, api);
  await injectPermissions(event, api);
};
