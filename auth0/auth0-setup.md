# Auth0 Setup

PIXLISE requires Auth0 for authentication and there are some customisations that need to be done on a default account to make it all work.

## Application
Add a single page application via the Auth0 web interface with the following customisations:
- Add `http://localhost:4200/authenticate` as an Allowed Callback URL
- Add `http://localhost:4200` as an Allowed Logout URL
- Add `http://localhost:4200` as an Allowed Web Origins
- Under Advanced Settings, Grant Types: ensure "Implicit", "Authorization Code", "Refresh Token" and "Password" are ticked

## API
Add a back-end API via the Auth0 web interface, making note of the "identifier" string as this will be the `audience` field in all JWTs created by user logins. Add the following permissions for the back-end API:
- `write:quantification`Create Quantifications
- `read:piquant-config`	View piquant configurations per device
- `write:piquant-config`	Editing piquant configurations per device
- `download:piquant`	Downloading piquant binaries
- `export:map`	Allow exporting maps from map browser tab
- `read:data-analysis`	For reading ROI, element set, annotation, expressions
- `write:data-analysis`	For add/edit/delete of ROI, element set, annotation, expressions
- `write:pixlise-settings`	Saving PIXLISE app settings, eg view state
- `read:pixlise-settings`	Reading PIXLISE app settings, eg view state
- `write:metrics`	Saving metrics about user interaction/clicks etc
- `read:piquant-jobs`	View all active and completed piquant jobs
- `read:user-roles`	Viewing users and their roles
- `read:user-settings` Reading users own settings, pretty much everyone should be able to do this, to view subscription/data collection/name
- `write:user-settings` Reading users own settings, pretty much everyone should be able to do this, to change subscription/data collection/name
- `write:shared-roi`	Sharing ROIs
- `write:shared-element-set`	Sharing element sets
- `write:shared-quantification`	Sharing quantifications
- `write:shared-annotation`	Sharing spectrum chart annotations
- `write:shared-expression`	Sharing data expressions
- `write:user-roles`	Adding/deleting user roles
- `access:PIXL-FM`	Allows access to PIXL flightmodel datasets
- `access:Stony Brook Breadboard`	Test data from Stony Brook breadboard
- `access:JPL Breadboard`	Allows user access to JPL breadboard test data sets
- `no-permission`	Marking user as not having permissions, different from Unassigned user, so we know what error msg to show for newly signed up users.
- `access:PIXL-EM`	Allows access to PIXL engineering model datasets
- `write:bless-quant`	Bless a (already shared) quantification
- `write:publish-quant`	Publish a quantification to PDS
- `read:diffraction-peaks`	Reading user created and accepted diffraction peaks
- `write:diffraction-peaks`	Create user defined diffraction peaks and accept automatically detected ones
- `write:dataset`	Allows editing datasets (titles, custom images)

## Roles
At the time of writing, the PIXLISE UI depends on the following "claims" in the JWT permissions under ['https://pixlise.qut.edu.au/auth']['permissions']:
- write:piquant-config
- read:user-roles
- read:piquant-jobs
- access:* (Groups of datasets need access:groupname assigned to the user through a role or directly)

The API is the other piece of code that depends on the "claims", and this interacts with all of the permissions listed above in the API section.

## RULES
The Auth0 account doesn't fully cater for us out-of-the-box and needs some custom rules created:

### Include Permissions In ID Token
The claims are not automatically included in the JWT so we have a rule for that to be done. Firstly, set the Auth0 name space in place of `AUTHO-NAMESPACE-GOES-HERE` in `rule-include-permissions-in-id-token.js` then create a rule and add the contents of `rule-include-permissions-in-id-token.js`

### Username Rule
Username is email is not included by default in the JWT, so we have a rule for that too. Firstly, set the Auth0 domain in place of `DOMAIN_GOES_HERE` in `rule-return-username.js`. This will ensure that any JWT generated will have a custom section named by the domain, and PIXLISE can then read those values. 

## New User Unassigned Role

When a new user signs in for the first time, we assign them a role "Unassigned New User", so they are easy to distinguish and so we know what permissions they have (none). Custom rule can be found in `rule-set-unassigned-role-in-new-users.js`. Replace the role id with whatever the id is on your setup.

## User Email Verification

Prevents users who have not yet verified their email from logging in. See `rule-check-email-verified.js`

## Login page customisation

PIXLISE UI was was connected to Auth0 in 2019, and made use of the "classic" Universal Login page, requiring a redirect to Auth0. This should be the safest/most secure way to use Auth0 at time of writing. The "new" page, without customisation has a whole bunch of silly text and looks way uglier.

To support having a sign-up and login button separately, we've had to modify the login page to check for a parameter indicating what mode the Auth0 login popup is in. The code for this is in `custom-universal-login-page.js`
