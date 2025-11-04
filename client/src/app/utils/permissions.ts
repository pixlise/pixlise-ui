import { IdToken } from "@auth0/auth0-spa-js";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";

export class Permissions {
  // Creation of quantification (checked on UI for showing quant button and API when called to create one). Also applies to spectrum fit!
  //public static readonly permissionCreateQuantification = "write:quantification";

  // Should we show piquant config tab
  //public static readonly permissionEditPiquantConfig = "write:piquant-config";

  // Is user allowed to administer user roles - controls showing the admin tab and side panel+tag picker "isAdmin" field listens to this
  //public static readonly permissionViewUserRoles = "read:user-roles";

  // Controls visibility of "Admin" tab, within which it's used to determine showing the "Quant Jobs" admin tab that lists all quants
  //public static readonly permissionViewPiquantJobs = "read:piquant-jobs";

  // Controls showing bless button
  //public static readonly permissionBlessQuantification = "write:bless-quant";

  // Controls showing publish button
  //public static readonly permissionPublishQuantification = "write:publish-quant";

  // Allows showing "Edit" button next to "Open" on dataset tiles page (when a user has selected a dataset)
  //public static readonly permissionEditDataset = "write:dataset";

  // Controls allowing user to edit/add diffraction peaks on diffraction and roughness side-bar tabs
  //public static readonly permissionEditDiffractionPeaks = "write:diffraction-peaks";

  // Allows exporting using main toolbar export button and any other export buttons
  //public static readonly permissionExportMap = "export:map";

  // Defines user has no permissions set, meaning the dataset tiles screen shows an error
  //public static readonly permissionNone = "no-permission";

  // Prefix for a permission which defines access to a given group (of datasets)
  //private static readonly permissionAccessPrefix = "access:";

  // The name of the permissions list in claims defined in our JWT
  private static readonly authPermissions = "permissions";

  // NEW PERMISSIONS - the lower case ones above are deprecated...
  public static readonly permissionCreateQuantification = "QUANTIFY";
  public static readonly permissionEditDataset = "EDIT_SCAN";
  public static readonly permissionEditElementSet = "EDIT_ELEMENT_SET";
  public static readonly permissionEditDevices = "EDIT_DEVICES";


  public static hasPermissionSet(claims: IdToken, permissionToCheck: string): boolean {
    if (
      !claims ||
      !claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace] ||
      !claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace][Permissions.authPermissions]
    ) {
      // nothing to look in!
      return false;
    }

    // Look for the permission item
    const permissions = claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace][Permissions.authPermissions];
    return permissions.indexOf(permissionToCheck) != -1;
  }

  public static permissionCount(claims: IdToken): number {
    if (
      !claims ||
      !claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace] ||
      !claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace][Permissions.authPermissions]
    ) {
      // nothing to look in!
      return -1;
    }

    // Look for the permission item
    const permissions = claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace][Permissions.authPermissions];
    return permissions.length;
  }

  // Gets all groups that the permissions in claims allow for
  // public static getGroupsPermissionAllows(claims: IdToken): string[] {
  //   let result = [];

  //   if (
  //     claims &&
  //     claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace] &&
  //     claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace][Permissions.authPermissions]
  //   ) {
  //     let permissions = claims[EnvConfigurationInitService.getConfig$.value!.auth0_namespace][Permissions.authPermissions];
  //     for (let perm of permissions) {
  //       if (perm.startsWith(Permissions.permissionAccessPrefix)) {
  //         let justGroup = perm.substring(Permissions.permissionAccessPrefix.length);
  //         result.push(justGroup);
  //       }
  //     }
  //   }

  //   return result;
  // }
}
