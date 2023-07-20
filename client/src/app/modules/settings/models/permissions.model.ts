const FEATURE_TO_PERMISSION_MAPPING = {
    "admin": "PIXLISE_ADMIN",
    "createGroup": "PIXLISE_ADMIN",
    "renameGroup": "PIXLISE_ADMIN",
    "deleteGroup": "PIXLISE_ADMIN",
    "addUserToGroup": "PIXLISE_ADMIN",
    "removeUserFromGroup": "PIXLISE_ADMIN",
    "editScan": "SCAN_EDIT",
    "editROI": "EDIT_ROI",
    "editViewState": "EDIT_VIEW_STATE",
    "editUserDetails": "EDIT_OWN_USER",
    "sendUserNotifications": "PIXLISE_ADMIN",
    "createTag": "EDIT_TAGS",
    "deleteExpression": "EDIT_EXPRESSION",
    "editExpression": "EDIT_EXPRESSION",
    "editModule": "EDIT_EXPRESSION",
    "createElementSet": "EDIT_ELEMENT_SET",
    "deleteElementSet": "EDIT_ELEMENT_SET",
    "editElementSet": "EDIT_ELEMENT_SET",
    "editDiffractionPeak": "EDIT_DIFFRACTION",
    "deleteDiffractionPeak": "EDIT_DIFFRACTION",
    "listUserRoles": "USER_ADMIN",
    "createUserRole": "USER_ADMIN",
    "deleteUserRole": "USER_ADMIN",
};

export type FeatureRequest = keyof typeof FEATURE_TO_PERMISSION_MAPPING;

export class PermissionsModel {
    constructor() { }

    public static hasPermission(permissions: string[], featureRequest: FeatureRequest): boolean {
        return permissions.includes(FEATURE_TO_PERMISSION_MAPPING[featureRequest]);
    }
}