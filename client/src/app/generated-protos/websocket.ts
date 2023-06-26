/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { DetectorConfigReq, DetectorConfigResp } from "./detector-config-msgs";
import {
  DiffractionPeakManualDeleteReq,
  DiffractionPeakManualDeleteResp,
  DiffractionPeakManualListReq,
  DiffractionPeakManualListResp,
  DiffractionPeakManualWriteReq,
  DiffractionPeakManualWriteResp,
} from "./diffraction-manual-msgs";
import {
  DiffractionPeakStatusDeleteReq,
  DiffractionPeakStatusDeleteResp,
  DiffractionPeakStatusListReq,
  DiffractionPeakStatusListResp,
  DiffractionPeakStatusWriteReq,
  DiffractionPeakStatusWriteResp,
} from "./diffraction-status-msgs";
import {
  ElementSetDeleteReq,
  ElementSetDeleteResp,
  ElementSetGetReq,
  ElementSetGetResp,
  ElementSetListReq,
  ElementSetListResp,
  ElementSetWriteReq,
  ElementSetWriteResp,
} from "./element-set-msgs";
import { ExportFilesReq, ExportFilesResp } from "./export-msgs";
import {
  ExpressionGroupDeleteReq,
  ExpressionGroupDeleteResp,
  ExpressionGroupListReq,
  ExpressionGroupListResp,
  ExpressionGroupSetReq,
  ExpressionGroupSetResp,
} from "./expression-group-msgs";
import {
  ExpressionDeleteReq,
  ExpressionDeleteResp,
  ExpressionListReq,
  ExpressionListResp,
  ExpressionReq,
  ExpressionResp,
  ExpressionWriteExecStatReq,
  ExpressionWriteExecStatResp,
  ExpressionWriteReq,
  ExpressionWriteResp,
  ExpressionWriteResultReq,
  ExpressionWriteResultResp,
} from "./expression-msgs";
import {
  ImageDeleteReq,
  ImageDeleteResp,
  ImageListReq,
  ImageListResp,
  ImageListUpd,
  ImageSetDefaultReq,
  ImageSetDefaultResp,
  ImageUploadReq,
  ImageUploadResp,
} from "./image-msgs";
import { LogGetLevelReq, LogGetLevelResp, LogReadReq, LogReadResp, LogSetLevelReq, LogSetLevelResp } from "./log-msgs";
import {
  DataModuleListReq,
  DataModuleListResp,
  DataModuleReq,
  DataModuleResp,
  DataModuleWriteReq,
  DataModuleWriteResp,
} from "./module-msgs";
import {
  PiquantConfigListReq,
  PiquantConfigListResp,
  PiquantConfigVersionReq,
  PiquantConfigVersionResp,
  PiquantConfigVersionsListReq,
  PiquantConfigVersionsListResp,
  PiquantSetVersionReq,
  PiquantSetVersionResp,
  PiquantVersionListReq,
  PiquantVersionListResp,
} from "./piquant-msgs";
import { PseudoIntensityReq, PseudoIntensityResp } from "./pseudo-intensities-msgs";
import {
  RegionOfInterestDeleteReq,
  RegionOfInterestDeleteResp,
  RegionOfInterestListReq,
  RegionOfInterestListResp,
  RegionOfInterestReq,
  RegionOfInterestResp,
  RegionOfInterestWriteReq,
  RegionOfInterestWriteResp,
} from "./roi-msgs";
import { ScanImageLocationsReq, ScanImageLocationsResp } from "./scan-beam-location-msgs";
import { ScanLocationReq, ScanLocationResp } from "./scan-location-msgs";
import {
  ScanListReq,
  ScanListResp,
  ScanListUpd,
  ScanMetaLabelsReq,
  ScanMetaLabelsResp,
  ScanMetaWriteReq,
  ScanMetaWriteResp,
  ScanTriggerReImportReq,
  ScanTriggerReImportResp,
  ScanUploadReq,
  ScanUploadResp,
} from "./scan-msgs";
import { SpectrumReq, SpectrumResp } from "./spectrum-msgs";
import { TagCreateReq, TagCreateResp, TagDeleteReq, TagDeleteResp, TagListReq, TagListResp } from "./tag-msgs";
import { RunTestReq, RunTestResp } from "./test-msgs";
import {
  UserDismissHintReq,
  UserDismissHintResp,
  UserHintsReq,
  UserHintsResp,
  UserHintsToggleReq,
  UserHintsToggleResp,
  UserHintsUpd,
} from "./user-hints-msgs";
import {
  UserAddRoleReq,
  UserAddRoleResp,
  UserDeleteRoleReq,
  UserDeleteRoleResp,
  UserListReq,
  UserListResp,
  UserRoleListReq,
  UserRoleListResp,
  UserRolesListReq,
  UserRolesListResp,
} from "./user-management-msgs";
import {
  UserDetailsReq,
  UserDetailsResp,
  UserDetailsUpd,
  UserDetailsWriteReq,
  UserDetailsWriteResp,
} from "./user-msgs";
import {
  SendUserNotificationReq,
  SendUserNotificationResp,
  UserNotificationReq,
  UserNotificationResp,
  UserNotificationUpd,
} from "./user-notification-msgs";
import {
  UserNotificationSettingsReq,
  UserNotificationSettingsResp,
  UserNotificationSettingsUpd,
  UserNotificationSettingsWriteReq,
  UserNotificationSettingsWriteResp,
} from "./user-notification-setting-msgs";

export const protobufPackage = "";

/** The overall wrapper WSMessage */
export interface WSMessage {
  /**
   * Helps associate request and response:
   * Should be a number counting up for each request sent from client, responses should include the same number
   * Other messages can leave this empty
   */
  msgId: number;
  dataModuleListReq?: DataModuleListReq | undefined;
  dataModuleListResp?: DataModuleListResp | undefined;
  dataModuleReq?: DataModuleReq | undefined;
  dataModuleResp?: DataModuleResp | undefined;
  dataModuleWriteReq?: DataModuleWriteReq | undefined;
  dataModuleWriteResp?: DataModuleWriteResp | undefined;
  detectorConfigReq?: DetectorConfigReq | undefined;
  detectorConfigResp?: DetectorConfigResp | undefined;
  diffractionPeakManualDeleteReq?: DiffractionPeakManualDeleteReq | undefined;
  diffractionPeakManualDeleteResp?: DiffractionPeakManualDeleteResp | undefined;
  diffractionPeakManualListReq?: DiffractionPeakManualListReq | undefined;
  diffractionPeakManualListResp?: DiffractionPeakManualListResp | undefined;
  diffractionPeakManualWriteReq?: DiffractionPeakManualWriteReq | undefined;
  diffractionPeakManualWriteResp?: DiffractionPeakManualWriteResp | undefined;
  diffractionPeakStatusDeleteReq?: DiffractionPeakStatusDeleteReq | undefined;
  diffractionPeakStatusDeleteResp?: DiffractionPeakStatusDeleteResp | undefined;
  diffractionPeakStatusListReq?: DiffractionPeakStatusListReq | undefined;
  diffractionPeakStatusListResp?: DiffractionPeakStatusListResp | undefined;
  diffractionPeakStatusWriteReq?: DiffractionPeakStatusWriteReq | undefined;
  diffractionPeakStatusWriteResp?: DiffractionPeakStatusWriteResp | undefined;
  elementSetDeleteReq?: ElementSetDeleteReq | undefined;
  elementSetDeleteResp?: ElementSetDeleteResp | undefined;
  elementSetGetReq?: ElementSetGetReq | undefined;
  elementSetGetResp?: ElementSetGetResp | undefined;
  elementSetListReq?: ElementSetListReq | undefined;
  elementSetListResp?: ElementSetListResp | undefined;
  elementSetWriteReq?: ElementSetWriteReq | undefined;
  elementSetWriteResp?: ElementSetWriteResp | undefined;
  exportFilesReq?: ExportFilesReq | undefined;
  exportFilesResp?: ExportFilesResp | undefined;
  expressionDeleteReq?: ExpressionDeleteReq | undefined;
  expressionDeleteResp?: ExpressionDeleteResp | undefined;
  expressionGroupDeleteReq?: ExpressionGroupDeleteReq | undefined;
  expressionGroupDeleteResp?: ExpressionGroupDeleteResp | undefined;
  expressionGroupListReq?: ExpressionGroupListReq | undefined;
  expressionGroupListResp?: ExpressionGroupListResp | undefined;
  expressionGroupSetReq?: ExpressionGroupSetReq | undefined;
  expressionGroupSetResp?: ExpressionGroupSetResp | undefined;
  expressionListReq?: ExpressionListReq | undefined;
  expressionListResp?: ExpressionListResp | undefined;
  expressionReq?: ExpressionReq | undefined;
  expressionResp?: ExpressionResp | undefined;
  expressionWriteExecStatReq?: ExpressionWriteExecStatReq | undefined;
  expressionWriteExecStatResp?: ExpressionWriteExecStatResp | undefined;
  expressionWriteReq?: ExpressionWriteReq | undefined;
  expressionWriteResp?: ExpressionWriteResp | undefined;
  expressionWriteResultReq?: ExpressionWriteResultReq | undefined;
  expressionWriteResultResp?: ExpressionWriteResultResp | undefined;
  imageDeleteReq?: ImageDeleteReq | undefined;
  imageDeleteResp?: ImageDeleteResp | undefined;
  imageListReq?: ImageListReq | undefined;
  imageListResp?: ImageListResp | undefined;
  imageListUpd?: ImageListUpd | undefined;
  imageSetDefaultReq?: ImageSetDefaultReq | undefined;
  imageSetDefaultResp?: ImageSetDefaultResp | undefined;
  imageUploadReq?: ImageUploadReq | undefined;
  imageUploadResp?: ImageUploadResp | undefined;
  logGetLevelReq?: LogGetLevelReq | undefined;
  logGetLevelResp?: LogGetLevelResp | undefined;
  logReadReq?: LogReadReq | undefined;
  logReadResp?: LogReadResp | undefined;
  logSetLevelReq?: LogSetLevelReq | undefined;
  logSetLevelResp?: LogSetLevelResp | undefined;
  piquantConfigListReq?: PiquantConfigListReq | undefined;
  piquantConfigListResp?: PiquantConfigListResp | undefined;
  piquantConfigVersionReq?: PiquantConfigVersionReq | undefined;
  piquantConfigVersionResp?: PiquantConfigVersionResp | undefined;
  piquantConfigVersionsListReq?: PiquantConfigVersionsListReq | undefined;
  piquantConfigVersionsListResp?: PiquantConfigVersionsListResp | undefined;
  piquantSetVersionReq?: PiquantSetVersionReq | undefined;
  piquantSetVersionResp?: PiquantSetVersionResp | undefined;
  piquantVersionListReq?: PiquantVersionListReq | undefined;
  piquantVersionListResp?: PiquantVersionListResp | undefined;
  pseudoIntensityReq?: PseudoIntensityReq | undefined;
  pseudoIntensityResp?: PseudoIntensityResp | undefined;
  regionOfInterestDeleteReq?: RegionOfInterestDeleteReq | undefined;
  regionOfInterestDeleteResp?: RegionOfInterestDeleteResp | undefined;
  regionOfInterestListReq?: RegionOfInterestListReq | undefined;
  regionOfInterestListResp?: RegionOfInterestListResp | undefined;
  regionOfInterestReq?: RegionOfInterestReq | undefined;
  regionOfInterestResp?: RegionOfInterestResp | undefined;
  regionOfInterestWriteReq?: RegionOfInterestWriteReq | undefined;
  regionOfInterestWriteResp?: RegionOfInterestWriteResp | undefined;
  runTestReq?: RunTestReq | undefined;
  runTestResp?: RunTestResp | undefined;
  scanImageLocationsReq?: ScanImageLocationsReq | undefined;
  scanImageLocationsResp?: ScanImageLocationsResp | undefined;
  scanListReq?: ScanListReq | undefined;
  scanListResp?: ScanListResp | undefined;
  scanListUpd?: ScanListUpd | undefined;
  scanLocationReq?: ScanLocationReq | undefined;
  scanLocationResp?: ScanLocationResp | undefined;
  scanMetaLabelsReq?: ScanMetaLabelsReq | undefined;
  scanMetaLabelsResp?: ScanMetaLabelsResp | undefined;
  scanMetaWriteReq?: ScanMetaWriteReq | undefined;
  scanMetaWriteResp?: ScanMetaWriteResp | undefined;
  scanTriggerReImportReq?: ScanTriggerReImportReq | undefined;
  scanTriggerReImportResp?: ScanTriggerReImportResp | undefined;
  scanUploadReq?: ScanUploadReq | undefined;
  scanUploadResp?: ScanUploadResp | undefined;
  sendUserNotificationReq?: SendUserNotificationReq | undefined;
  sendUserNotificationResp?: SendUserNotificationResp | undefined;
  spectrumReq?: SpectrumReq | undefined;
  spectrumResp?: SpectrumResp | undefined;
  tagCreateReq?: TagCreateReq | undefined;
  tagCreateResp?: TagCreateResp | undefined;
  tagDeleteReq?: TagDeleteReq | undefined;
  tagDeleteResp?: TagDeleteResp | undefined;
  tagListReq?: TagListReq | undefined;
  tagListResp?: TagListResp | undefined;
  userAddRoleReq?: UserAddRoleReq | undefined;
  userAddRoleResp?: UserAddRoleResp | undefined;
  userDeleteRoleReq?: UserDeleteRoleReq | undefined;
  userDeleteRoleResp?: UserDeleteRoleResp | undefined;
  userDetailsReq?: UserDetailsReq | undefined;
  userDetailsResp?: UserDetailsResp | undefined;
  userDetailsUpd?: UserDetailsUpd | undefined;
  userDetailsWriteReq?: UserDetailsWriteReq | undefined;
  userDetailsWriteResp?: UserDetailsWriteResp | undefined;
  userDismissHintReq?: UserDismissHintReq | undefined;
  userDismissHintResp?: UserDismissHintResp | undefined;
  userHintsReq?: UserHintsReq | undefined;
  userHintsResp?: UserHintsResp | undefined;
  userHintsToggleReq?: UserHintsToggleReq | undefined;
  userHintsToggleResp?: UserHintsToggleResp | undefined;
  userHintsUpd?: UserHintsUpd | undefined;
  userListReq?: UserListReq | undefined;
  userListResp?: UserListResp | undefined;
  userNotificationReq?: UserNotificationReq | undefined;
  userNotificationResp?: UserNotificationResp | undefined;
  userNotificationSettingsReq?: UserNotificationSettingsReq | undefined;
  userNotificationSettingsResp?: UserNotificationSettingsResp | undefined;
  userNotificationSettingsUpd?: UserNotificationSettingsUpd | undefined;
  userNotificationSettingsWriteReq?: UserNotificationSettingsWriteReq | undefined;
  userNotificationSettingsWriteResp?: UserNotificationSettingsWriteResp | undefined;
  userNotificationUpd?: UserNotificationUpd | undefined;
  userRoleListReq?: UserRoleListReq | undefined;
  userRoleListResp?: UserRoleListResp | undefined;
  userRolesListReq?: UserRolesListReq | undefined;
  userRolesListResp?: UserRolesListResp | undefined;
}

function createBaseWSMessage(): WSMessage {
  return {
    msgId: 0,
    dataModuleListReq: undefined,
    dataModuleListResp: undefined,
    dataModuleReq: undefined,
    dataModuleResp: undefined,
    dataModuleWriteReq: undefined,
    dataModuleWriteResp: undefined,
    detectorConfigReq: undefined,
    detectorConfigResp: undefined,
    diffractionPeakManualDeleteReq: undefined,
    diffractionPeakManualDeleteResp: undefined,
    diffractionPeakManualListReq: undefined,
    diffractionPeakManualListResp: undefined,
    diffractionPeakManualWriteReq: undefined,
    diffractionPeakManualWriteResp: undefined,
    diffractionPeakStatusDeleteReq: undefined,
    diffractionPeakStatusDeleteResp: undefined,
    diffractionPeakStatusListReq: undefined,
    diffractionPeakStatusListResp: undefined,
    diffractionPeakStatusWriteReq: undefined,
    diffractionPeakStatusWriteResp: undefined,
    elementSetDeleteReq: undefined,
    elementSetDeleteResp: undefined,
    elementSetGetReq: undefined,
    elementSetGetResp: undefined,
    elementSetListReq: undefined,
    elementSetListResp: undefined,
    elementSetWriteReq: undefined,
    elementSetWriteResp: undefined,
    exportFilesReq: undefined,
    exportFilesResp: undefined,
    expressionDeleteReq: undefined,
    expressionDeleteResp: undefined,
    expressionGroupDeleteReq: undefined,
    expressionGroupDeleteResp: undefined,
    expressionGroupListReq: undefined,
    expressionGroupListResp: undefined,
    expressionGroupSetReq: undefined,
    expressionGroupSetResp: undefined,
    expressionListReq: undefined,
    expressionListResp: undefined,
    expressionReq: undefined,
    expressionResp: undefined,
    expressionWriteExecStatReq: undefined,
    expressionWriteExecStatResp: undefined,
    expressionWriteReq: undefined,
    expressionWriteResp: undefined,
    expressionWriteResultReq: undefined,
    expressionWriteResultResp: undefined,
    imageDeleteReq: undefined,
    imageDeleteResp: undefined,
    imageListReq: undefined,
    imageListResp: undefined,
    imageListUpd: undefined,
    imageSetDefaultReq: undefined,
    imageSetDefaultResp: undefined,
    imageUploadReq: undefined,
    imageUploadResp: undefined,
    logGetLevelReq: undefined,
    logGetLevelResp: undefined,
    logReadReq: undefined,
    logReadResp: undefined,
    logSetLevelReq: undefined,
    logSetLevelResp: undefined,
    piquantConfigListReq: undefined,
    piquantConfigListResp: undefined,
    piquantConfigVersionReq: undefined,
    piquantConfigVersionResp: undefined,
    piquantConfigVersionsListReq: undefined,
    piquantConfigVersionsListResp: undefined,
    piquantSetVersionReq: undefined,
    piquantSetVersionResp: undefined,
    piquantVersionListReq: undefined,
    piquantVersionListResp: undefined,
    pseudoIntensityReq: undefined,
    pseudoIntensityResp: undefined,
    regionOfInterestDeleteReq: undefined,
    regionOfInterestDeleteResp: undefined,
    regionOfInterestListReq: undefined,
    regionOfInterestListResp: undefined,
    regionOfInterestReq: undefined,
    regionOfInterestResp: undefined,
    regionOfInterestWriteReq: undefined,
    regionOfInterestWriteResp: undefined,
    runTestReq: undefined,
    runTestResp: undefined,
    scanImageLocationsReq: undefined,
    scanImageLocationsResp: undefined,
    scanListReq: undefined,
    scanListResp: undefined,
    scanListUpd: undefined,
    scanLocationReq: undefined,
    scanLocationResp: undefined,
    scanMetaLabelsReq: undefined,
    scanMetaLabelsResp: undefined,
    scanMetaWriteReq: undefined,
    scanMetaWriteResp: undefined,
    scanTriggerReImportReq: undefined,
    scanTriggerReImportResp: undefined,
    scanUploadReq: undefined,
    scanUploadResp: undefined,
    sendUserNotificationReq: undefined,
    sendUserNotificationResp: undefined,
    spectrumReq: undefined,
    spectrumResp: undefined,
    tagCreateReq: undefined,
    tagCreateResp: undefined,
    tagDeleteReq: undefined,
    tagDeleteResp: undefined,
    tagListReq: undefined,
    tagListResp: undefined,
    userAddRoleReq: undefined,
    userAddRoleResp: undefined,
    userDeleteRoleReq: undefined,
    userDeleteRoleResp: undefined,
    userDetailsReq: undefined,
    userDetailsResp: undefined,
    userDetailsUpd: undefined,
    userDetailsWriteReq: undefined,
    userDetailsWriteResp: undefined,
    userDismissHintReq: undefined,
    userDismissHintResp: undefined,
    userHintsReq: undefined,
    userHintsResp: undefined,
    userHintsToggleReq: undefined,
    userHintsToggleResp: undefined,
    userHintsUpd: undefined,
    userListReq: undefined,
    userListResp: undefined,
    userNotificationReq: undefined,
    userNotificationResp: undefined,
    userNotificationSettingsReq: undefined,
    userNotificationSettingsResp: undefined,
    userNotificationSettingsUpd: undefined,
    userNotificationSettingsWriteReq: undefined,
    userNotificationSettingsWriteResp: undefined,
    userNotificationUpd: undefined,
    userRoleListReq: undefined,
    userRoleListResp: undefined,
    userRolesListReq: undefined,
    userRolesListResp: undefined,
  };
}

export const WSMessage = {
  encode(message: WSMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.msgId !== 0) {
      writer.uint32(8).uint32(message.msgId);
    }
    if (message.dataModuleListReq !== undefined) {
      DataModuleListReq.encode(message.dataModuleListReq, writer.uint32(82).fork()).ldelim();
    }
    if (message.dataModuleListResp !== undefined) {
      DataModuleListResp.encode(message.dataModuleListResp, writer.uint32(90).fork()).ldelim();
    }
    if (message.dataModuleReq !== undefined) {
      DataModuleReq.encode(message.dataModuleReq, writer.uint32(98).fork()).ldelim();
    }
    if (message.dataModuleResp !== undefined) {
      DataModuleResp.encode(message.dataModuleResp, writer.uint32(106).fork()).ldelim();
    }
    if (message.dataModuleWriteReq !== undefined) {
      DataModuleWriteReq.encode(message.dataModuleWriteReq, writer.uint32(114).fork()).ldelim();
    }
    if (message.dataModuleWriteResp !== undefined) {
      DataModuleWriteResp.encode(message.dataModuleWriteResp, writer.uint32(122).fork()).ldelim();
    }
    if (message.detectorConfigReq !== undefined) {
      DetectorConfigReq.encode(message.detectorConfigReq, writer.uint32(130).fork()).ldelim();
    }
    if (message.detectorConfigResp !== undefined) {
      DetectorConfigResp.encode(message.detectorConfigResp, writer.uint32(138).fork()).ldelim();
    }
    if (message.diffractionPeakManualDeleteReq !== undefined) {
      DiffractionPeakManualDeleteReq.encode(message.diffractionPeakManualDeleteReq, writer.uint32(146).fork()).ldelim();
    }
    if (message.diffractionPeakManualDeleteResp !== undefined) {
      DiffractionPeakManualDeleteResp.encode(message.diffractionPeakManualDeleteResp, writer.uint32(154).fork())
        .ldelim();
    }
    if (message.diffractionPeakManualListReq !== undefined) {
      DiffractionPeakManualListReq.encode(message.diffractionPeakManualListReq, writer.uint32(162).fork()).ldelim();
    }
    if (message.diffractionPeakManualListResp !== undefined) {
      DiffractionPeakManualListResp.encode(message.diffractionPeakManualListResp, writer.uint32(170).fork()).ldelim();
    }
    if (message.diffractionPeakManualWriteReq !== undefined) {
      DiffractionPeakManualWriteReq.encode(message.diffractionPeakManualWriteReq, writer.uint32(178).fork()).ldelim();
    }
    if (message.diffractionPeakManualWriteResp !== undefined) {
      DiffractionPeakManualWriteResp.encode(message.diffractionPeakManualWriteResp, writer.uint32(186).fork()).ldelim();
    }
    if (message.diffractionPeakStatusDeleteReq !== undefined) {
      DiffractionPeakStatusDeleteReq.encode(message.diffractionPeakStatusDeleteReq, writer.uint32(194).fork()).ldelim();
    }
    if (message.diffractionPeakStatusDeleteResp !== undefined) {
      DiffractionPeakStatusDeleteResp.encode(message.diffractionPeakStatusDeleteResp, writer.uint32(202).fork())
        .ldelim();
    }
    if (message.diffractionPeakStatusListReq !== undefined) {
      DiffractionPeakStatusListReq.encode(message.diffractionPeakStatusListReq, writer.uint32(210).fork()).ldelim();
    }
    if (message.diffractionPeakStatusListResp !== undefined) {
      DiffractionPeakStatusListResp.encode(message.diffractionPeakStatusListResp, writer.uint32(218).fork()).ldelim();
    }
    if (message.diffractionPeakStatusWriteReq !== undefined) {
      DiffractionPeakStatusWriteReq.encode(message.diffractionPeakStatusWriteReq, writer.uint32(226).fork()).ldelim();
    }
    if (message.diffractionPeakStatusWriteResp !== undefined) {
      DiffractionPeakStatusWriteResp.encode(message.diffractionPeakStatusWriteResp, writer.uint32(234).fork()).ldelim();
    }
    if (message.elementSetDeleteReq !== undefined) {
      ElementSetDeleteReq.encode(message.elementSetDeleteReq, writer.uint32(242).fork()).ldelim();
    }
    if (message.elementSetDeleteResp !== undefined) {
      ElementSetDeleteResp.encode(message.elementSetDeleteResp, writer.uint32(250).fork()).ldelim();
    }
    if (message.elementSetGetReq !== undefined) {
      ElementSetGetReq.encode(message.elementSetGetReq, writer.uint32(258).fork()).ldelim();
    }
    if (message.elementSetGetResp !== undefined) {
      ElementSetGetResp.encode(message.elementSetGetResp, writer.uint32(266).fork()).ldelim();
    }
    if (message.elementSetListReq !== undefined) {
      ElementSetListReq.encode(message.elementSetListReq, writer.uint32(274).fork()).ldelim();
    }
    if (message.elementSetListResp !== undefined) {
      ElementSetListResp.encode(message.elementSetListResp, writer.uint32(282).fork()).ldelim();
    }
    if (message.elementSetWriteReq !== undefined) {
      ElementSetWriteReq.encode(message.elementSetWriteReq, writer.uint32(290).fork()).ldelim();
    }
    if (message.elementSetWriteResp !== undefined) {
      ElementSetWriteResp.encode(message.elementSetWriteResp, writer.uint32(298).fork()).ldelim();
    }
    if (message.exportFilesReq !== undefined) {
      ExportFilesReq.encode(message.exportFilesReq, writer.uint32(306).fork()).ldelim();
    }
    if (message.exportFilesResp !== undefined) {
      ExportFilesResp.encode(message.exportFilesResp, writer.uint32(314).fork()).ldelim();
    }
    if (message.expressionDeleteReq !== undefined) {
      ExpressionDeleteReq.encode(message.expressionDeleteReq, writer.uint32(322).fork()).ldelim();
    }
    if (message.expressionDeleteResp !== undefined) {
      ExpressionDeleteResp.encode(message.expressionDeleteResp, writer.uint32(330).fork()).ldelim();
    }
    if (message.expressionGroupDeleteReq !== undefined) {
      ExpressionGroupDeleteReq.encode(message.expressionGroupDeleteReq, writer.uint32(338).fork()).ldelim();
    }
    if (message.expressionGroupDeleteResp !== undefined) {
      ExpressionGroupDeleteResp.encode(message.expressionGroupDeleteResp, writer.uint32(346).fork()).ldelim();
    }
    if (message.expressionGroupListReq !== undefined) {
      ExpressionGroupListReq.encode(message.expressionGroupListReq, writer.uint32(354).fork()).ldelim();
    }
    if (message.expressionGroupListResp !== undefined) {
      ExpressionGroupListResp.encode(message.expressionGroupListResp, writer.uint32(362).fork()).ldelim();
    }
    if (message.expressionGroupSetReq !== undefined) {
      ExpressionGroupSetReq.encode(message.expressionGroupSetReq, writer.uint32(370).fork()).ldelim();
    }
    if (message.expressionGroupSetResp !== undefined) {
      ExpressionGroupSetResp.encode(message.expressionGroupSetResp, writer.uint32(378).fork()).ldelim();
    }
    if (message.expressionListReq !== undefined) {
      ExpressionListReq.encode(message.expressionListReq, writer.uint32(386).fork()).ldelim();
    }
    if (message.expressionListResp !== undefined) {
      ExpressionListResp.encode(message.expressionListResp, writer.uint32(394).fork()).ldelim();
    }
    if (message.expressionReq !== undefined) {
      ExpressionReq.encode(message.expressionReq, writer.uint32(402).fork()).ldelim();
    }
    if (message.expressionResp !== undefined) {
      ExpressionResp.encode(message.expressionResp, writer.uint32(410).fork()).ldelim();
    }
    if (message.expressionWriteExecStatReq !== undefined) {
      ExpressionWriteExecStatReq.encode(message.expressionWriteExecStatReq, writer.uint32(418).fork()).ldelim();
    }
    if (message.expressionWriteExecStatResp !== undefined) {
      ExpressionWriteExecStatResp.encode(message.expressionWriteExecStatResp, writer.uint32(426).fork()).ldelim();
    }
    if (message.expressionWriteReq !== undefined) {
      ExpressionWriteReq.encode(message.expressionWriteReq, writer.uint32(434).fork()).ldelim();
    }
    if (message.expressionWriteResp !== undefined) {
      ExpressionWriteResp.encode(message.expressionWriteResp, writer.uint32(442).fork()).ldelim();
    }
    if (message.expressionWriteResultReq !== undefined) {
      ExpressionWriteResultReq.encode(message.expressionWriteResultReq, writer.uint32(450).fork()).ldelim();
    }
    if (message.expressionWriteResultResp !== undefined) {
      ExpressionWriteResultResp.encode(message.expressionWriteResultResp, writer.uint32(458).fork()).ldelim();
    }
    if (message.imageDeleteReq !== undefined) {
      ImageDeleteReq.encode(message.imageDeleteReq, writer.uint32(466).fork()).ldelim();
    }
    if (message.imageDeleteResp !== undefined) {
      ImageDeleteResp.encode(message.imageDeleteResp, writer.uint32(474).fork()).ldelim();
    }
    if (message.imageListReq !== undefined) {
      ImageListReq.encode(message.imageListReq, writer.uint32(482).fork()).ldelim();
    }
    if (message.imageListResp !== undefined) {
      ImageListResp.encode(message.imageListResp, writer.uint32(490).fork()).ldelim();
    }
    if (message.imageListUpd !== undefined) {
      ImageListUpd.encode(message.imageListUpd, writer.uint32(1154).fork()).ldelim();
    }
    if (message.imageSetDefaultReq !== undefined) {
      ImageSetDefaultReq.encode(message.imageSetDefaultReq, writer.uint32(498).fork()).ldelim();
    }
    if (message.imageSetDefaultResp !== undefined) {
      ImageSetDefaultResp.encode(message.imageSetDefaultResp, writer.uint32(506).fork()).ldelim();
    }
    if (message.imageUploadReq !== undefined) {
      ImageUploadReq.encode(message.imageUploadReq, writer.uint32(514).fork()).ldelim();
    }
    if (message.imageUploadResp !== undefined) {
      ImageUploadResp.encode(message.imageUploadResp, writer.uint32(522).fork()).ldelim();
    }
    if (message.logGetLevelReq !== undefined) {
      LogGetLevelReq.encode(message.logGetLevelReq, writer.uint32(530).fork()).ldelim();
    }
    if (message.logGetLevelResp !== undefined) {
      LogGetLevelResp.encode(message.logGetLevelResp, writer.uint32(538).fork()).ldelim();
    }
    if (message.logReadReq !== undefined) {
      LogReadReq.encode(message.logReadReq, writer.uint32(546).fork()).ldelim();
    }
    if (message.logReadResp !== undefined) {
      LogReadResp.encode(message.logReadResp, writer.uint32(554).fork()).ldelim();
    }
    if (message.logSetLevelReq !== undefined) {
      LogSetLevelReq.encode(message.logSetLevelReq, writer.uint32(562).fork()).ldelim();
    }
    if (message.logSetLevelResp !== undefined) {
      LogSetLevelResp.encode(message.logSetLevelResp, writer.uint32(570).fork()).ldelim();
    }
    if (message.piquantConfigListReq !== undefined) {
      PiquantConfigListReq.encode(message.piquantConfigListReq, writer.uint32(578).fork()).ldelim();
    }
    if (message.piquantConfigListResp !== undefined) {
      PiquantConfigListResp.encode(message.piquantConfigListResp, writer.uint32(586).fork()).ldelim();
    }
    if (message.piquantConfigVersionReq !== undefined) {
      PiquantConfigVersionReq.encode(message.piquantConfigVersionReq, writer.uint32(594).fork()).ldelim();
    }
    if (message.piquantConfigVersionResp !== undefined) {
      PiquantConfigVersionResp.encode(message.piquantConfigVersionResp, writer.uint32(602).fork()).ldelim();
    }
    if (message.piquantConfigVersionsListReq !== undefined) {
      PiquantConfigVersionsListReq.encode(message.piquantConfigVersionsListReq, writer.uint32(610).fork()).ldelim();
    }
    if (message.piquantConfigVersionsListResp !== undefined) {
      PiquantConfigVersionsListResp.encode(message.piquantConfigVersionsListResp, writer.uint32(618).fork()).ldelim();
    }
    if (message.piquantSetVersionReq !== undefined) {
      PiquantSetVersionReq.encode(message.piquantSetVersionReq, writer.uint32(626).fork()).ldelim();
    }
    if (message.piquantSetVersionResp !== undefined) {
      PiquantSetVersionResp.encode(message.piquantSetVersionResp, writer.uint32(634).fork()).ldelim();
    }
    if (message.piquantVersionListReq !== undefined) {
      PiquantVersionListReq.encode(message.piquantVersionListReq, writer.uint32(642).fork()).ldelim();
    }
    if (message.piquantVersionListResp !== undefined) {
      PiquantVersionListResp.encode(message.piquantVersionListResp, writer.uint32(650).fork()).ldelim();
    }
    if (message.pseudoIntensityReq !== undefined) {
      PseudoIntensityReq.encode(message.pseudoIntensityReq, writer.uint32(658).fork()).ldelim();
    }
    if (message.pseudoIntensityResp !== undefined) {
      PseudoIntensityResp.encode(message.pseudoIntensityResp, writer.uint32(666).fork()).ldelim();
    }
    if (message.regionOfInterestDeleteReq !== undefined) {
      RegionOfInterestDeleteReq.encode(message.regionOfInterestDeleteReq, writer.uint32(674).fork()).ldelim();
    }
    if (message.regionOfInterestDeleteResp !== undefined) {
      RegionOfInterestDeleteResp.encode(message.regionOfInterestDeleteResp, writer.uint32(682).fork()).ldelim();
    }
    if (message.regionOfInterestListReq !== undefined) {
      RegionOfInterestListReq.encode(message.regionOfInterestListReq, writer.uint32(690).fork()).ldelim();
    }
    if (message.regionOfInterestListResp !== undefined) {
      RegionOfInterestListResp.encode(message.regionOfInterestListResp, writer.uint32(698).fork()).ldelim();
    }
    if (message.regionOfInterestReq !== undefined) {
      RegionOfInterestReq.encode(message.regionOfInterestReq, writer.uint32(706).fork()).ldelim();
    }
    if (message.regionOfInterestResp !== undefined) {
      RegionOfInterestResp.encode(message.regionOfInterestResp, writer.uint32(714).fork()).ldelim();
    }
    if (message.regionOfInterestWriteReq !== undefined) {
      RegionOfInterestWriteReq.encode(message.regionOfInterestWriteReq, writer.uint32(722).fork()).ldelim();
    }
    if (message.regionOfInterestWriteResp !== undefined) {
      RegionOfInterestWriteResp.encode(message.regionOfInterestWriteResp, writer.uint32(730).fork()).ldelim();
    }
    if (message.runTestReq !== undefined) {
      RunTestReq.encode(message.runTestReq, writer.uint32(738).fork()).ldelim();
    }
    if (message.runTestResp !== undefined) {
      RunTestResp.encode(message.runTestResp, writer.uint32(746).fork()).ldelim();
    }
    if (message.scanImageLocationsReq !== undefined) {
      ScanImageLocationsReq.encode(message.scanImageLocationsReq, writer.uint32(754).fork()).ldelim();
    }
    if (message.scanImageLocationsResp !== undefined) {
      ScanImageLocationsResp.encode(message.scanImageLocationsResp, writer.uint32(762).fork()).ldelim();
    }
    if (message.scanListReq !== undefined) {
      ScanListReq.encode(message.scanListReq, writer.uint32(770).fork()).ldelim();
    }
    if (message.scanListResp !== undefined) {
      ScanListResp.encode(message.scanListResp, writer.uint32(778).fork()).ldelim();
    }
    if (message.scanListUpd !== undefined) {
      ScanListUpd.encode(message.scanListUpd, writer.uint32(1162).fork()).ldelim();
    }
    if (message.scanLocationReq !== undefined) {
      ScanLocationReq.encode(message.scanLocationReq, writer.uint32(786).fork()).ldelim();
    }
    if (message.scanLocationResp !== undefined) {
      ScanLocationResp.encode(message.scanLocationResp, writer.uint32(794).fork()).ldelim();
    }
    if (message.scanMetaLabelsReq !== undefined) {
      ScanMetaLabelsReq.encode(message.scanMetaLabelsReq, writer.uint32(802).fork()).ldelim();
    }
    if (message.scanMetaLabelsResp !== undefined) {
      ScanMetaLabelsResp.encode(message.scanMetaLabelsResp, writer.uint32(810).fork()).ldelim();
    }
    if (message.scanMetaWriteReq !== undefined) {
      ScanMetaWriteReq.encode(message.scanMetaWriteReq, writer.uint32(818).fork()).ldelim();
    }
    if (message.scanMetaWriteResp !== undefined) {
      ScanMetaWriteResp.encode(message.scanMetaWriteResp, writer.uint32(826).fork()).ldelim();
    }
    if (message.scanTriggerReImportReq !== undefined) {
      ScanTriggerReImportReq.encode(message.scanTriggerReImportReq, writer.uint32(834).fork()).ldelim();
    }
    if (message.scanTriggerReImportResp !== undefined) {
      ScanTriggerReImportResp.encode(message.scanTriggerReImportResp, writer.uint32(842).fork()).ldelim();
    }
    if (message.scanUploadReq !== undefined) {
      ScanUploadReq.encode(message.scanUploadReq, writer.uint32(850).fork()).ldelim();
    }
    if (message.scanUploadResp !== undefined) {
      ScanUploadResp.encode(message.scanUploadResp, writer.uint32(858).fork()).ldelim();
    }
    if (message.sendUserNotificationReq !== undefined) {
      SendUserNotificationReq.encode(message.sendUserNotificationReq, writer.uint32(866).fork()).ldelim();
    }
    if (message.sendUserNotificationResp !== undefined) {
      SendUserNotificationResp.encode(message.sendUserNotificationResp, writer.uint32(874).fork()).ldelim();
    }
    if (message.spectrumReq !== undefined) {
      SpectrumReq.encode(message.spectrumReq, writer.uint32(882).fork()).ldelim();
    }
    if (message.spectrumResp !== undefined) {
      SpectrumResp.encode(message.spectrumResp, writer.uint32(890).fork()).ldelim();
    }
    if (message.tagCreateReq !== undefined) {
      TagCreateReq.encode(message.tagCreateReq, writer.uint32(898).fork()).ldelim();
    }
    if (message.tagCreateResp !== undefined) {
      TagCreateResp.encode(message.tagCreateResp, writer.uint32(906).fork()).ldelim();
    }
    if (message.tagDeleteReq !== undefined) {
      TagDeleteReq.encode(message.tagDeleteReq, writer.uint32(914).fork()).ldelim();
    }
    if (message.tagDeleteResp !== undefined) {
      TagDeleteResp.encode(message.tagDeleteResp, writer.uint32(922).fork()).ldelim();
    }
    if (message.tagListReq !== undefined) {
      TagListReq.encode(message.tagListReq, writer.uint32(930).fork()).ldelim();
    }
    if (message.tagListResp !== undefined) {
      TagListResp.encode(message.tagListResp, writer.uint32(938).fork()).ldelim();
    }
    if (message.userAddRoleReq !== undefined) {
      UserAddRoleReq.encode(message.userAddRoleReq, writer.uint32(946).fork()).ldelim();
    }
    if (message.userAddRoleResp !== undefined) {
      UserAddRoleResp.encode(message.userAddRoleResp, writer.uint32(954).fork()).ldelim();
    }
    if (message.userDeleteRoleReq !== undefined) {
      UserDeleteRoleReq.encode(message.userDeleteRoleReq, writer.uint32(962).fork()).ldelim();
    }
    if (message.userDeleteRoleResp !== undefined) {
      UserDeleteRoleResp.encode(message.userDeleteRoleResp, writer.uint32(970).fork()).ldelim();
    }
    if (message.userDetailsReq !== undefined) {
      UserDetailsReq.encode(message.userDetailsReq, writer.uint32(978).fork()).ldelim();
    }
    if (message.userDetailsResp !== undefined) {
      UserDetailsResp.encode(message.userDetailsResp, writer.uint32(986).fork()).ldelim();
    }
    if (message.userDetailsUpd !== undefined) {
      UserDetailsUpd.encode(message.userDetailsUpd, writer.uint32(1170).fork()).ldelim();
    }
    if (message.userDetailsWriteReq !== undefined) {
      UserDetailsWriteReq.encode(message.userDetailsWriteReq, writer.uint32(994).fork()).ldelim();
    }
    if (message.userDetailsWriteResp !== undefined) {
      UserDetailsWriteResp.encode(message.userDetailsWriteResp, writer.uint32(1002).fork()).ldelim();
    }
    if (message.userDismissHintReq !== undefined) {
      UserDismissHintReq.encode(message.userDismissHintReq, writer.uint32(1010).fork()).ldelim();
    }
    if (message.userDismissHintResp !== undefined) {
      UserDismissHintResp.encode(message.userDismissHintResp, writer.uint32(1018).fork()).ldelim();
    }
    if (message.userHintsReq !== undefined) {
      UserHintsReq.encode(message.userHintsReq, writer.uint32(1026).fork()).ldelim();
    }
    if (message.userHintsResp !== undefined) {
      UserHintsResp.encode(message.userHintsResp, writer.uint32(1034).fork()).ldelim();
    }
    if (message.userHintsToggleReq !== undefined) {
      UserHintsToggleReq.encode(message.userHintsToggleReq, writer.uint32(1042).fork()).ldelim();
    }
    if (message.userHintsToggleResp !== undefined) {
      UserHintsToggleResp.encode(message.userHintsToggleResp, writer.uint32(1050).fork()).ldelim();
    }
    if (message.userHintsUpd !== undefined) {
      UserHintsUpd.encode(message.userHintsUpd, writer.uint32(1178).fork()).ldelim();
    }
    if (message.userListReq !== undefined) {
      UserListReq.encode(message.userListReq, writer.uint32(1058).fork()).ldelim();
    }
    if (message.userListResp !== undefined) {
      UserListResp.encode(message.userListResp, writer.uint32(1066).fork()).ldelim();
    }
    if (message.userNotificationReq !== undefined) {
      UserNotificationReq.encode(message.userNotificationReq, writer.uint32(1074).fork()).ldelim();
    }
    if (message.userNotificationResp !== undefined) {
      UserNotificationResp.encode(message.userNotificationResp, writer.uint32(1082).fork()).ldelim();
    }
    if (message.userNotificationSettingsReq !== undefined) {
      UserNotificationSettingsReq.encode(message.userNotificationSettingsReq, writer.uint32(1090).fork()).ldelim();
    }
    if (message.userNotificationSettingsResp !== undefined) {
      UserNotificationSettingsResp.encode(message.userNotificationSettingsResp, writer.uint32(1098).fork()).ldelim();
    }
    if (message.userNotificationSettingsUpd !== undefined) {
      UserNotificationSettingsUpd.encode(message.userNotificationSettingsUpd, writer.uint32(1186).fork()).ldelim();
    }
    if (message.userNotificationSettingsWriteReq !== undefined) {
      UserNotificationSettingsWriteReq.encode(message.userNotificationSettingsWriteReq, writer.uint32(1106).fork())
        .ldelim();
    }
    if (message.userNotificationSettingsWriteResp !== undefined) {
      UserNotificationSettingsWriteResp.encode(message.userNotificationSettingsWriteResp, writer.uint32(1114).fork())
        .ldelim();
    }
    if (message.userNotificationUpd !== undefined) {
      UserNotificationUpd.encode(message.userNotificationUpd, writer.uint32(1194).fork()).ldelim();
    }
    if (message.userRoleListReq !== undefined) {
      UserRoleListReq.encode(message.userRoleListReq, writer.uint32(1122).fork()).ldelim();
    }
    if (message.userRoleListResp !== undefined) {
      UserRoleListResp.encode(message.userRoleListResp, writer.uint32(1130).fork()).ldelim();
    }
    if (message.userRolesListReq !== undefined) {
      UserRolesListReq.encode(message.userRolesListReq, writer.uint32(1138).fork()).ldelim();
    }
    if (message.userRolesListResp !== undefined) {
      UserRolesListResp.encode(message.userRolesListResp, writer.uint32(1146).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): WSMessage {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseWSMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.msgId = reader.uint32();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.dataModuleListReq = DataModuleListReq.decode(reader, reader.uint32());
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.dataModuleListResp = DataModuleListResp.decode(reader, reader.uint32());
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.dataModuleReq = DataModuleReq.decode(reader, reader.uint32());
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.dataModuleResp = DataModuleResp.decode(reader, reader.uint32());
          continue;
        case 14:
          if (tag !== 114) {
            break;
          }

          message.dataModuleWriteReq = DataModuleWriteReq.decode(reader, reader.uint32());
          continue;
        case 15:
          if (tag !== 122) {
            break;
          }

          message.dataModuleWriteResp = DataModuleWriteResp.decode(reader, reader.uint32());
          continue;
        case 16:
          if (tag !== 130) {
            break;
          }

          message.detectorConfigReq = DetectorConfigReq.decode(reader, reader.uint32());
          continue;
        case 17:
          if (tag !== 138) {
            break;
          }

          message.detectorConfigResp = DetectorConfigResp.decode(reader, reader.uint32());
          continue;
        case 18:
          if (tag !== 146) {
            break;
          }

          message.diffractionPeakManualDeleteReq = DiffractionPeakManualDeleteReq.decode(reader, reader.uint32());
          continue;
        case 19:
          if (tag !== 154) {
            break;
          }

          message.diffractionPeakManualDeleteResp = DiffractionPeakManualDeleteResp.decode(reader, reader.uint32());
          continue;
        case 20:
          if (tag !== 162) {
            break;
          }

          message.diffractionPeakManualListReq = DiffractionPeakManualListReq.decode(reader, reader.uint32());
          continue;
        case 21:
          if (tag !== 170) {
            break;
          }

          message.diffractionPeakManualListResp = DiffractionPeakManualListResp.decode(reader, reader.uint32());
          continue;
        case 22:
          if (tag !== 178) {
            break;
          }

          message.diffractionPeakManualWriteReq = DiffractionPeakManualWriteReq.decode(reader, reader.uint32());
          continue;
        case 23:
          if (tag !== 186) {
            break;
          }

          message.diffractionPeakManualWriteResp = DiffractionPeakManualWriteResp.decode(reader, reader.uint32());
          continue;
        case 24:
          if (tag !== 194) {
            break;
          }

          message.diffractionPeakStatusDeleteReq = DiffractionPeakStatusDeleteReq.decode(reader, reader.uint32());
          continue;
        case 25:
          if (tag !== 202) {
            break;
          }

          message.diffractionPeakStatusDeleteResp = DiffractionPeakStatusDeleteResp.decode(reader, reader.uint32());
          continue;
        case 26:
          if (tag !== 210) {
            break;
          }

          message.diffractionPeakStatusListReq = DiffractionPeakStatusListReq.decode(reader, reader.uint32());
          continue;
        case 27:
          if (tag !== 218) {
            break;
          }

          message.diffractionPeakStatusListResp = DiffractionPeakStatusListResp.decode(reader, reader.uint32());
          continue;
        case 28:
          if (tag !== 226) {
            break;
          }

          message.diffractionPeakStatusWriteReq = DiffractionPeakStatusWriteReq.decode(reader, reader.uint32());
          continue;
        case 29:
          if (tag !== 234) {
            break;
          }

          message.diffractionPeakStatusWriteResp = DiffractionPeakStatusWriteResp.decode(reader, reader.uint32());
          continue;
        case 30:
          if (tag !== 242) {
            break;
          }

          message.elementSetDeleteReq = ElementSetDeleteReq.decode(reader, reader.uint32());
          continue;
        case 31:
          if (tag !== 250) {
            break;
          }

          message.elementSetDeleteResp = ElementSetDeleteResp.decode(reader, reader.uint32());
          continue;
        case 32:
          if (tag !== 258) {
            break;
          }

          message.elementSetGetReq = ElementSetGetReq.decode(reader, reader.uint32());
          continue;
        case 33:
          if (tag !== 266) {
            break;
          }

          message.elementSetGetResp = ElementSetGetResp.decode(reader, reader.uint32());
          continue;
        case 34:
          if (tag !== 274) {
            break;
          }

          message.elementSetListReq = ElementSetListReq.decode(reader, reader.uint32());
          continue;
        case 35:
          if (tag !== 282) {
            break;
          }

          message.elementSetListResp = ElementSetListResp.decode(reader, reader.uint32());
          continue;
        case 36:
          if (tag !== 290) {
            break;
          }

          message.elementSetWriteReq = ElementSetWriteReq.decode(reader, reader.uint32());
          continue;
        case 37:
          if (tag !== 298) {
            break;
          }

          message.elementSetWriteResp = ElementSetWriteResp.decode(reader, reader.uint32());
          continue;
        case 38:
          if (tag !== 306) {
            break;
          }

          message.exportFilesReq = ExportFilesReq.decode(reader, reader.uint32());
          continue;
        case 39:
          if (tag !== 314) {
            break;
          }

          message.exportFilesResp = ExportFilesResp.decode(reader, reader.uint32());
          continue;
        case 40:
          if (tag !== 322) {
            break;
          }

          message.expressionDeleteReq = ExpressionDeleteReq.decode(reader, reader.uint32());
          continue;
        case 41:
          if (tag !== 330) {
            break;
          }

          message.expressionDeleteResp = ExpressionDeleteResp.decode(reader, reader.uint32());
          continue;
        case 42:
          if (tag !== 338) {
            break;
          }

          message.expressionGroupDeleteReq = ExpressionGroupDeleteReq.decode(reader, reader.uint32());
          continue;
        case 43:
          if (tag !== 346) {
            break;
          }

          message.expressionGroupDeleteResp = ExpressionGroupDeleteResp.decode(reader, reader.uint32());
          continue;
        case 44:
          if (tag !== 354) {
            break;
          }

          message.expressionGroupListReq = ExpressionGroupListReq.decode(reader, reader.uint32());
          continue;
        case 45:
          if (tag !== 362) {
            break;
          }

          message.expressionGroupListResp = ExpressionGroupListResp.decode(reader, reader.uint32());
          continue;
        case 46:
          if (tag !== 370) {
            break;
          }

          message.expressionGroupSetReq = ExpressionGroupSetReq.decode(reader, reader.uint32());
          continue;
        case 47:
          if (tag !== 378) {
            break;
          }

          message.expressionGroupSetResp = ExpressionGroupSetResp.decode(reader, reader.uint32());
          continue;
        case 48:
          if (tag !== 386) {
            break;
          }

          message.expressionListReq = ExpressionListReq.decode(reader, reader.uint32());
          continue;
        case 49:
          if (tag !== 394) {
            break;
          }

          message.expressionListResp = ExpressionListResp.decode(reader, reader.uint32());
          continue;
        case 50:
          if (tag !== 402) {
            break;
          }

          message.expressionReq = ExpressionReq.decode(reader, reader.uint32());
          continue;
        case 51:
          if (tag !== 410) {
            break;
          }

          message.expressionResp = ExpressionResp.decode(reader, reader.uint32());
          continue;
        case 52:
          if (tag !== 418) {
            break;
          }

          message.expressionWriteExecStatReq = ExpressionWriteExecStatReq.decode(reader, reader.uint32());
          continue;
        case 53:
          if (tag !== 426) {
            break;
          }

          message.expressionWriteExecStatResp = ExpressionWriteExecStatResp.decode(reader, reader.uint32());
          continue;
        case 54:
          if (tag !== 434) {
            break;
          }

          message.expressionWriteReq = ExpressionWriteReq.decode(reader, reader.uint32());
          continue;
        case 55:
          if (tag !== 442) {
            break;
          }

          message.expressionWriteResp = ExpressionWriteResp.decode(reader, reader.uint32());
          continue;
        case 56:
          if (tag !== 450) {
            break;
          }

          message.expressionWriteResultReq = ExpressionWriteResultReq.decode(reader, reader.uint32());
          continue;
        case 57:
          if (tag !== 458) {
            break;
          }

          message.expressionWriteResultResp = ExpressionWriteResultResp.decode(reader, reader.uint32());
          continue;
        case 58:
          if (tag !== 466) {
            break;
          }

          message.imageDeleteReq = ImageDeleteReq.decode(reader, reader.uint32());
          continue;
        case 59:
          if (tag !== 474) {
            break;
          }

          message.imageDeleteResp = ImageDeleteResp.decode(reader, reader.uint32());
          continue;
        case 60:
          if (tag !== 482) {
            break;
          }

          message.imageListReq = ImageListReq.decode(reader, reader.uint32());
          continue;
        case 61:
          if (tag !== 490) {
            break;
          }

          message.imageListResp = ImageListResp.decode(reader, reader.uint32());
          continue;
        case 144:
          if (tag !== 1154) {
            break;
          }

          message.imageListUpd = ImageListUpd.decode(reader, reader.uint32());
          continue;
        case 62:
          if (tag !== 498) {
            break;
          }

          message.imageSetDefaultReq = ImageSetDefaultReq.decode(reader, reader.uint32());
          continue;
        case 63:
          if (tag !== 506) {
            break;
          }

          message.imageSetDefaultResp = ImageSetDefaultResp.decode(reader, reader.uint32());
          continue;
        case 64:
          if (tag !== 514) {
            break;
          }

          message.imageUploadReq = ImageUploadReq.decode(reader, reader.uint32());
          continue;
        case 65:
          if (tag !== 522) {
            break;
          }

          message.imageUploadResp = ImageUploadResp.decode(reader, reader.uint32());
          continue;
        case 66:
          if (tag !== 530) {
            break;
          }

          message.logGetLevelReq = LogGetLevelReq.decode(reader, reader.uint32());
          continue;
        case 67:
          if (tag !== 538) {
            break;
          }

          message.logGetLevelResp = LogGetLevelResp.decode(reader, reader.uint32());
          continue;
        case 68:
          if (tag !== 546) {
            break;
          }

          message.logReadReq = LogReadReq.decode(reader, reader.uint32());
          continue;
        case 69:
          if (tag !== 554) {
            break;
          }

          message.logReadResp = LogReadResp.decode(reader, reader.uint32());
          continue;
        case 70:
          if (tag !== 562) {
            break;
          }

          message.logSetLevelReq = LogSetLevelReq.decode(reader, reader.uint32());
          continue;
        case 71:
          if (tag !== 570) {
            break;
          }

          message.logSetLevelResp = LogSetLevelResp.decode(reader, reader.uint32());
          continue;
        case 72:
          if (tag !== 578) {
            break;
          }

          message.piquantConfigListReq = PiquantConfigListReq.decode(reader, reader.uint32());
          continue;
        case 73:
          if (tag !== 586) {
            break;
          }

          message.piquantConfigListResp = PiquantConfigListResp.decode(reader, reader.uint32());
          continue;
        case 74:
          if (tag !== 594) {
            break;
          }

          message.piquantConfigVersionReq = PiquantConfigVersionReq.decode(reader, reader.uint32());
          continue;
        case 75:
          if (tag !== 602) {
            break;
          }

          message.piquantConfigVersionResp = PiquantConfigVersionResp.decode(reader, reader.uint32());
          continue;
        case 76:
          if (tag !== 610) {
            break;
          }

          message.piquantConfigVersionsListReq = PiquantConfigVersionsListReq.decode(reader, reader.uint32());
          continue;
        case 77:
          if (tag !== 618) {
            break;
          }

          message.piquantConfigVersionsListResp = PiquantConfigVersionsListResp.decode(reader, reader.uint32());
          continue;
        case 78:
          if (tag !== 626) {
            break;
          }

          message.piquantSetVersionReq = PiquantSetVersionReq.decode(reader, reader.uint32());
          continue;
        case 79:
          if (tag !== 634) {
            break;
          }

          message.piquantSetVersionResp = PiquantSetVersionResp.decode(reader, reader.uint32());
          continue;
        case 80:
          if (tag !== 642) {
            break;
          }

          message.piquantVersionListReq = PiquantVersionListReq.decode(reader, reader.uint32());
          continue;
        case 81:
          if (tag !== 650) {
            break;
          }

          message.piquantVersionListResp = PiquantVersionListResp.decode(reader, reader.uint32());
          continue;
        case 82:
          if (tag !== 658) {
            break;
          }

          message.pseudoIntensityReq = PseudoIntensityReq.decode(reader, reader.uint32());
          continue;
        case 83:
          if (tag !== 666) {
            break;
          }

          message.pseudoIntensityResp = PseudoIntensityResp.decode(reader, reader.uint32());
          continue;
        case 84:
          if (tag !== 674) {
            break;
          }

          message.regionOfInterestDeleteReq = RegionOfInterestDeleteReq.decode(reader, reader.uint32());
          continue;
        case 85:
          if (tag !== 682) {
            break;
          }

          message.regionOfInterestDeleteResp = RegionOfInterestDeleteResp.decode(reader, reader.uint32());
          continue;
        case 86:
          if (tag !== 690) {
            break;
          }

          message.regionOfInterestListReq = RegionOfInterestListReq.decode(reader, reader.uint32());
          continue;
        case 87:
          if (tag !== 698) {
            break;
          }

          message.regionOfInterestListResp = RegionOfInterestListResp.decode(reader, reader.uint32());
          continue;
        case 88:
          if (tag !== 706) {
            break;
          }

          message.regionOfInterestReq = RegionOfInterestReq.decode(reader, reader.uint32());
          continue;
        case 89:
          if (tag !== 714) {
            break;
          }

          message.regionOfInterestResp = RegionOfInterestResp.decode(reader, reader.uint32());
          continue;
        case 90:
          if (tag !== 722) {
            break;
          }

          message.regionOfInterestWriteReq = RegionOfInterestWriteReq.decode(reader, reader.uint32());
          continue;
        case 91:
          if (tag !== 730) {
            break;
          }

          message.regionOfInterestWriteResp = RegionOfInterestWriteResp.decode(reader, reader.uint32());
          continue;
        case 92:
          if (tag !== 738) {
            break;
          }

          message.runTestReq = RunTestReq.decode(reader, reader.uint32());
          continue;
        case 93:
          if (tag !== 746) {
            break;
          }

          message.runTestResp = RunTestResp.decode(reader, reader.uint32());
          continue;
        case 94:
          if (tag !== 754) {
            break;
          }

          message.scanImageLocationsReq = ScanImageLocationsReq.decode(reader, reader.uint32());
          continue;
        case 95:
          if (tag !== 762) {
            break;
          }

          message.scanImageLocationsResp = ScanImageLocationsResp.decode(reader, reader.uint32());
          continue;
        case 96:
          if (tag !== 770) {
            break;
          }

          message.scanListReq = ScanListReq.decode(reader, reader.uint32());
          continue;
        case 97:
          if (tag !== 778) {
            break;
          }

          message.scanListResp = ScanListResp.decode(reader, reader.uint32());
          continue;
        case 145:
          if (tag !== 1162) {
            break;
          }

          message.scanListUpd = ScanListUpd.decode(reader, reader.uint32());
          continue;
        case 98:
          if (tag !== 786) {
            break;
          }

          message.scanLocationReq = ScanLocationReq.decode(reader, reader.uint32());
          continue;
        case 99:
          if (tag !== 794) {
            break;
          }

          message.scanLocationResp = ScanLocationResp.decode(reader, reader.uint32());
          continue;
        case 100:
          if (tag !== 802) {
            break;
          }

          message.scanMetaLabelsReq = ScanMetaLabelsReq.decode(reader, reader.uint32());
          continue;
        case 101:
          if (tag !== 810) {
            break;
          }

          message.scanMetaLabelsResp = ScanMetaLabelsResp.decode(reader, reader.uint32());
          continue;
        case 102:
          if (tag !== 818) {
            break;
          }

          message.scanMetaWriteReq = ScanMetaWriteReq.decode(reader, reader.uint32());
          continue;
        case 103:
          if (tag !== 826) {
            break;
          }

          message.scanMetaWriteResp = ScanMetaWriteResp.decode(reader, reader.uint32());
          continue;
        case 104:
          if (tag !== 834) {
            break;
          }

          message.scanTriggerReImportReq = ScanTriggerReImportReq.decode(reader, reader.uint32());
          continue;
        case 105:
          if (tag !== 842) {
            break;
          }

          message.scanTriggerReImportResp = ScanTriggerReImportResp.decode(reader, reader.uint32());
          continue;
        case 106:
          if (tag !== 850) {
            break;
          }

          message.scanUploadReq = ScanUploadReq.decode(reader, reader.uint32());
          continue;
        case 107:
          if (tag !== 858) {
            break;
          }

          message.scanUploadResp = ScanUploadResp.decode(reader, reader.uint32());
          continue;
        case 108:
          if (tag !== 866) {
            break;
          }

          message.sendUserNotificationReq = SendUserNotificationReq.decode(reader, reader.uint32());
          continue;
        case 109:
          if (tag !== 874) {
            break;
          }

          message.sendUserNotificationResp = SendUserNotificationResp.decode(reader, reader.uint32());
          continue;
        case 110:
          if (tag !== 882) {
            break;
          }

          message.spectrumReq = SpectrumReq.decode(reader, reader.uint32());
          continue;
        case 111:
          if (tag !== 890) {
            break;
          }

          message.spectrumResp = SpectrumResp.decode(reader, reader.uint32());
          continue;
        case 112:
          if (tag !== 898) {
            break;
          }

          message.tagCreateReq = TagCreateReq.decode(reader, reader.uint32());
          continue;
        case 113:
          if (tag !== 906) {
            break;
          }

          message.tagCreateResp = TagCreateResp.decode(reader, reader.uint32());
          continue;
        case 114:
          if (tag !== 914) {
            break;
          }

          message.tagDeleteReq = TagDeleteReq.decode(reader, reader.uint32());
          continue;
        case 115:
          if (tag !== 922) {
            break;
          }

          message.tagDeleteResp = TagDeleteResp.decode(reader, reader.uint32());
          continue;
        case 116:
          if (tag !== 930) {
            break;
          }

          message.tagListReq = TagListReq.decode(reader, reader.uint32());
          continue;
        case 117:
          if (tag !== 938) {
            break;
          }

          message.tagListResp = TagListResp.decode(reader, reader.uint32());
          continue;
        case 118:
          if (tag !== 946) {
            break;
          }

          message.userAddRoleReq = UserAddRoleReq.decode(reader, reader.uint32());
          continue;
        case 119:
          if (tag !== 954) {
            break;
          }

          message.userAddRoleResp = UserAddRoleResp.decode(reader, reader.uint32());
          continue;
        case 120:
          if (tag !== 962) {
            break;
          }

          message.userDeleteRoleReq = UserDeleteRoleReq.decode(reader, reader.uint32());
          continue;
        case 121:
          if (tag !== 970) {
            break;
          }

          message.userDeleteRoleResp = UserDeleteRoleResp.decode(reader, reader.uint32());
          continue;
        case 122:
          if (tag !== 978) {
            break;
          }

          message.userDetailsReq = UserDetailsReq.decode(reader, reader.uint32());
          continue;
        case 123:
          if (tag !== 986) {
            break;
          }

          message.userDetailsResp = UserDetailsResp.decode(reader, reader.uint32());
          continue;
        case 146:
          if (tag !== 1170) {
            break;
          }

          message.userDetailsUpd = UserDetailsUpd.decode(reader, reader.uint32());
          continue;
        case 124:
          if (tag !== 994) {
            break;
          }

          message.userDetailsWriteReq = UserDetailsWriteReq.decode(reader, reader.uint32());
          continue;
        case 125:
          if (tag !== 1002) {
            break;
          }

          message.userDetailsWriteResp = UserDetailsWriteResp.decode(reader, reader.uint32());
          continue;
        case 126:
          if (tag !== 1010) {
            break;
          }

          message.userDismissHintReq = UserDismissHintReq.decode(reader, reader.uint32());
          continue;
        case 127:
          if (tag !== 1018) {
            break;
          }

          message.userDismissHintResp = UserDismissHintResp.decode(reader, reader.uint32());
          continue;
        case 128:
          if (tag !== 1026) {
            break;
          }

          message.userHintsReq = UserHintsReq.decode(reader, reader.uint32());
          continue;
        case 129:
          if (tag !== 1034) {
            break;
          }

          message.userHintsResp = UserHintsResp.decode(reader, reader.uint32());
          continue;
        case 130:
          if (tag !== 1042) {
            break;
          }

          message.userHintsToggleReq = UserHintsToggleReq.decode(reader, reader.uint32());
          continue;
        case 131:
          if (tag !== 1050) {
            break;
          }

          message.userHintsToggleResp = UserHintsToggleResp.decode(reader, reader.uint32());
          continue;
        case 147:
          if (tag !== 1178) {
            break;
          }

          message.userHintsUpd = UserHintsUpd.decode(reader, reader.uint32());
          continue;
        case 132:
          if (tag !== 1058) {
            break;
          }

          message.userListReq = UserListReq.decode(reader, reader.uint32());
          continue;
        case 133:
          if (tag !== 1066) {
            break;
          }

          message.userListResp = UserListResp.decode(reader, reader.uint32());
          continue;
        case 134:
          if (tag !== 1074) {
            break;
          }

          message.userNotificationReq = UserNotificationReq.decode(reader, reader.uint32());
          continue;
        case 135:
          if (tag !== 1082) {
            break;
          }

          message.userNotificationResp = UserNotificationResp.decode(reader, reader.uint32());
          continue;
        case 136:
          if (tag !== 1090) {
            break;
          }

          message.userNotificationSettingsReq = UserNotificationSettingsReq.decode(reader, reader.uint32());
          continue;
        case 137:
          if (tag !== 1098) {
            break;
          }

          message.userNotificationSettingsResp = UserNotificationSettingsResp.decode(reader, reader.uint32());
          continue;
        case 148:
          if (tag !== 1186) {
            break;
          }

          message.userNotificationSettingsUpd = UserNotificationSettingsUpd.decode(reader, reader.uint32());
          continue;
        case 138:
          if (tag !== 1106) {
            break;
          }

          message.userNotificationSettingsWriteReq = UserNotificationSettingsWriteReq.decode(reader, reader.uint32());
          continue;
        case 139:
          if (tag !== 1114) {
            break;
          }

          message.userNotificationSettingsWriteResp = UserNotificationSettingsWriteResp.decode(reader, reader.uint32());
          continue;
        case 149:
          if (tag !== 1194) {
            break;
          }

          message.userNotificationUpd = UserNotificationUpd.decode(reader, reader.uint32());
          continue;
        case 140:
          if (tag !== 1122) {
            break;
          }

          message.userRoleListReq = UserRoleListReq.decode(reader, reader.uint32());
          continue;
        case 141:
          if (tag !== 1130) {
            break;
          }

          message.userRoleListResp = UserRoleListResp.decode(reader, reader.uint32());
          continue;
        case 142:
          if (tag !== 1138) {
            break;
          }

          message.userRolesListReq = UserRolesListReq.decode(reader, reader.uint32());
          continue;
        case 143:
          if (tag !== 1146) {
            break;
          }

          message.userRolesListResp = UserRolesListResp.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): WSMessage {
    return {
      msgId: isSet(object.msgId) ? Number(object.msgId) : 0,
      dataModuleListReq: isSet(object.dataModuleListReq)
        ? DataModuleListReq.fromJSON(object.dataModuleListReq)
        : undefined,
      dataModuleListResp: isSet(object.dataModuleListResp)
        ? DataModuleListResp.fromJSON(object.dataModuleListResp)
        : undefined,
      dataModuleReq: isSet(object.dataModuleReq) ? DataModuleReq.fromJSON(object.dataModuleReq) : undefined,
      dataModuleResp: isSet(object.dataModuleResp) ? DataModuleResp.fromJSON(object.dataModuleResp) : undefined,
      dataModuleWriteReq: isSet(object.dataModuleWriteReq)
        ? DataModuleWriteReq.fromJSON(object.dataModuleWriteReq)
        : undefined,
      dataModuleWriteResp: isSet(object.dataModuleWriteResp)
        ? DataModuleWriteResp.fromJSON(object.dataModuleWriteResp)
        : undefined,
      detectorConfigReq: isSet(object.detectorConfigReq)
        ? DetectorConfigReq.fromJSON(object.detectorConfigReq)
        : undefined,
      detectorConfigResp: isSet(object.detectorConfigResp)
        ? DetectorConfigResp.fromJSON(object.detectorConfigResp)
        : undefined,
      diffractionPeakManualDeleteReq: isSet(object.diffractionPeakManualDeleteReq)
        ? DiffractionPeakManualDeleteReq.fromJSON(object.diffractionPeakManualDeleteReq)
        : undefined,
      diffractionPeakManualDeleteResp: isSet(object.diffractionPeakManualDeleteResp)
        ? DiffractionPeakManualDeleteResp.fromJSON(object.diffractionPeakManualDeleteResp)
        : undefined,
      diffractionPeakManualListReq: isSet(object.diffractionPeakManualListReq)
        ? DiffractionPeakManualListReq.fromJSON(object.diffractionPeakManualListReq)
        : undefined,
      diffractionPeakManualListResp: isSet(object.diffractionPeakManualListResp)
        ? DiffractionPeakManualListResp.fromJSON(object.diffractionPeakManualListResp)
        : undefined,
      diffractionPeakManualWriteReq: isSet(object.diffractionPeakManualWriteReq)
        ? DiffractionPeakManualWriteReq.fromJSON(object.diffractionPeakManualWriteReq)
        : undefined,
      diffractionPeakManualWriteResp: isSet(object.diffractionPeakManualWriteResp)
        ? DiffractionPeakManualWriteResp.fromJSON(object.diffractionPeakManualWriteResp)
        : undefined,
      diffractionPeakStatusDeleteReq: isSet(object.diffractionPeakStatusDeleteReq)
        ? DiffractionPeakStatusDeleteReq.fromJSON(object.diffractionPeakStatusDeleteReq)
        : undefined,
      diffractionPeakStatusDeleteResp: isSet(object.diffractionPeakStatusDeleteResp)
        ? DiffractionPeakStatusDeleteResp.fromJSON(object.diffractionPeakStatusDeleteResp)
        : undefined,
      diffractionPeakStatusListReq: isSet(object.diffractionPeakStatusListReq)
        ? DiffractionPeakStatusListReq.fromJSON(object.diffractionPeakStatusListReq)
        : undefined,
      diffractionPeakStatusListResp: isSet(object.diffractionPeakStatusListResp)
        ? DiffractionPeakStatusListResp.fromJSON(object.diffractionPeakStatusListResp)
        : undefined,
      diffractionPeakStatusWriteReq: isSet(object.diffractionPeakStatusWriteReq)
        ? DiffractionPeakStatusWriteReq.fromJSON(object.diffractionPeakStatusWriteReq)
        : undefined,
      diffractionPeakStatusWriteResp: isSet(object.diffractionPeakStatusWriteResp)
        ? DiffractionPeakStatusWriteResp.fromJSON(object.diffractionPeakStatusWriteResp)
        : undefined,
      elementSetDeleteReq: isSet(object.elementSetDeleteReq)
        ? ElementSetDeleteReq.fromJSON(object.elementSetDeleteReq)
        : undefined,
      elementSetDeleteResp: isSet(object.elementSetDeleteResp)
        ? ElementSetDeleteResp.fromJSON(object.elementSetDeleteResp)
        : undefined,
      elementSetGetReq: isSet(object.elementSetGetReq) ? ElementSetGetReq.fromJSON(object.elementSetGetReq) : undefined,
      elementSetGetResp: isSet(object.elementSetGetResp)
        ? ElementSetGetResp.fromJSON(object.elementSetGetResp)
        : undefined,
      elementSetListReq: isSet(object.elementSetListReq)
        ? ElementSetListReq.fromJSON(object.elementSetListReq)
        : undefined,
      elementSetListResp: isSet(object.elementSetListResp)
        ? ElementSetListResp.fromJSON(object.elementSetListResp)
        : undefined,
      elementSetWriteReq: isSet(object.elementSetWriteReq)
        ? ElementSetWriteReq.fromJSON(object.elementSetWriteReq)
        : undefined,
      elementSetWriteResp: isSet(object.elementSetWriteResp)
        ? ElementSetWriteResp.fromJSON(object.elementSetWriteResp)
        : undefined,
      exportFilesReq: isSet(object.exportFilesReq) ? ExportFilesReq.fromJSON(object.exportFilesReq) : undefined,
      exportFilesResp: isSet(object.exportFilesResp) ? ExportFilesResp.fromJSON(object.exportFilesResp) : undefined,
      expressionDeleteReq: isSet(object.expressionDeleteReq)
        ? ExpressionDeleteReq.fromJSON(object.expressionDeleteReq)
        : undefined,
      expressionDeleteResp: isSet(object.expressionDeleteResp)
        ? ExpressionDeleteResp.fromJSON(object.expressionDeleteResp)
        : undefined,
      expressionGroupDeleteReq: isSet(object.expressionGroupDeleteReq)
        ? ExpressionGroupDeleteReq.fromJSON(object.expressionGroupDeleteReq)
        : undefined,
      expressionGroupDeleteResp: isSet(object.expressionGroupDeleteResp)
        ? ExpressionGroupDeleteResp.fromJSON(object.expressionGroupDeleteResp)
        : undefined,
      expressionGroupListReq: isSet(object.expressionGroupListReq)
        ? ExpressionGroupListReq.fromJSON(object.expressionGroupListReq)
        : undefined,
      expressionGroupListResp: isSet(object.expressionGroupListResp)
        ? ExpressionGroupListResp.fromJSON(object.expressionGroupListResp)
        : undefined,
      expressionGroupSetReq: isSet(object.expressionGroupSetReq)
        ? ExpressionGroupSetReq.fromJSON(object.expressionGroupSetReq)
        : undefined,
      expressionGroupSetResp: isSet(object.expressionGroupSetResp)
        ? ExpressionGroupSetResp.fromJSON(object.expressionGroupSetResp)
        : undefined,
      expressionListReq: isSet(object.expressionListReq)
        ? ExpressionListReq.fromJSON(object.expressionListReq)
        : undefined,
      expressionListResp: isSet(object.expressionListResp)
        ? ExpressionListResp.fromJSON(object.expressionListResp)
        : undefined,
      expressionReq: isSet(object.expressionReq) ? ExpressionReq.fromJSON(object.expressionReq) : undefined,
      expressionResp: isSet(object.expressionResp) ? ExpressionResp.fromJSON(object.expressionResp) : undefined,
      expressionWriteExecStatReq: isSet(object.expressionWriteExecStatReq)
        ? ExpressionWriteExecStatReq.fromJSON(object.expressionWriteExecStatReq)
        : undefined,
      expressionWriteExecStatResp: isSet(object.expressionWriteExecStatResp)
        ? ExpressionWriteExecStatResp.fromJSON(object.expressionWriteExecStatResp)
        : undefined,
      expressionWriteReq: isSet(object.expressionWriteReq)
        ? ExpressionWriteReq.fromJSON(object.expressionWriteReq)
        : undefined,
      expressionWriteResp: isSet(object.expressionWriteResp)
        ? ExpressionWriteResp.fromJSON(object.expressionWriteResp)
        : undefined,
      expressionWriteResultReq: isSet(object.expressionWriteResultReq)
        ? ExpressionWriteResultReq.fromJSON(object.expressionWriteResultReq)
        : undefined,
      expressionWriteResultResp: isSet(object.expressionWriteResultResp)
        ? ExpressionWriteResultResp.fromJSON(object.expressionWriteResultResp)
        : undefined,
      imageDeleteReq: isSet(object.imageDeleteReq) ? ImageDeleteReq.fromJSON(object.imageDeleteReq) : undefined,
      imageDeleteResp: isSet(object.imageDeleteResp) ? ImageDeleteResp.fromJSON(object.imageDeleteResp) : undefined,
      imageListReq: isSet(object.imageListReq) ? ImageListReq.fromJSON(object.imageListReq) : undefined,
      imageListResp: isSet(object.imageListResp) ? ImageListResp.fromJSON(object.imageListResp) : undefined,
      imageListUpd: isSet(object.imageListUpd) ? ImageListUpd.fromJSON(object.imageListUpd) : undefined,
      imageSetDefaultReq: isSet(object.imageSetDefaultReq)
        ? ImageSetDefaultReq.fromJSON(object.imageSetDefaultReq)
        : undefined,
      imageSetDefaultResp: isSet(object.imageSetDefaultResp)
        ? ImageSetDefaultResp.fromJSON(object.imageSetDefaultResp)
        : undefined,
      imageUploadReq: isSet(object.imageUploadReq) ? ImageUploadReq.fromJSON(object.imageUploadReq) : undefined,
      imageUploadResp: isSet(object.imageUploadResp) ? ImageUploadResp.fromJSON(object.imageUploadResp) : undefined,
      logGetLevelReq: isSet(object.logGetLevelReq) ? LogGetLevelReq.fromJSON(object.logGetLevelReq) : undefined,
      logGetLevelResp: isSet(object.logGetLevelResp) ? LogGetLevelResp.fromJSON(object.logGetLevelResp) : undefined,
      logReadReq: isSet(object.logReadReq) ? LogReadReq.fromJSON(object.logReadReq) : undefined,
      logReadResp: isSet(object.logReadResp) ? LogReadResp.fromJSON(object.logReadResp) : undefined,
      logSetLevelReq: isSet(object.logSetLevelReq) ? LogSetLevelReq.fromJSON(object.logSetLevelReq) : undefined,
      logSetLevelResp: isSet(object.logSetLevelResp) ? LogSetLevelResp.fromJSON(object.logSetLevelResp) : undefined,
      piquantConfigListReq: isSet(object.piquantConfigListReq)
        ? PiquantConfigListReq.fromJSON(object.piquantConfigListReq)
        : undefined,
      piquantConfigListResp: isSet(object.piquantConfigListResp)
        ? PiquantConfigListResp.fromJSON(object.piquantConfigListResp)
        : undefined,
      piquantConfigVersionReq: isSet(object.piquantConfigVersionReq)
        ? PiquantConfigVersionReq.fromJSON(object.piquantConfigVersionReq)
        : undefined,
      piquantConfigVersionResp: isSet(object.piquantConfigVersionResp)
        ? PiquantConfigVersionResp.fromJSON(object.piquantConfigVersionResp)
        : undefined,
      piquantConfigVersionsListReq: isSet(object.piquantConfigVersionsListReq)
        ? PiquantConfigVersionsListReq.fromJSON(object.piquantConfigVersionsListReq)
        : undefined,
      piquantConfigVersionsListResp: isSet(object.piquantConfigVersionsListResp)
        ? PiquantConfigVersionsListResp.fromJSON(object.piquantConfigVersionsListResp)
        : undefined,
      piquantSetVersionReq: isSet(object.piquantSetVersionReq)
        ? PiquantSetVersionReq.fromJSON(object.piquantSetVersionReq)
        : undefined,
      piquantSetVersionResp: isSet(object.piquantSetVersionResp)
        ? PiquantSetVersionResp.fromJSON(object.piquantSetVersionResp)
        : undefined,
      piquantVersionListReq: isSet(object.piquantVersionListReq)
        ? PiquantVersionListReq.fromJSON(object.piquantVersionListReq)
        : undefined,
      piquantVersionListResp: isSet(object.piquantVersionListResp)
        ? PiquantVersionListResp.fromJSON(object.piquantVersionListResp)
        : undefined,
      pseudoIntensityReq: isSet(object.pseudoIntensityReq)
        ? PseudoIntensityReq.fromJSON(object.pseudoIntensityReq)
        : undefined,
      pseudoIntensityResp: isSet(object.pseudoIntensityResp)
        ? PseudoIntensityResp.fromJSON(object.pseudoIntensityResp)
        : undefined,
      regionOfInterestDeleteReq: isSet(object.regionOfInterestDeleteReq)
        ? RegionOfInterestDeleteReq.fromJSON(object.regionOfInterestDeleteReq)
        : undefined,
      regionOfInterestDeleteResp: isSet(object.regionOfInterestDeleteResp)
        ? RegionOfInterestDeleteResp.fromJSON(object.regionOfInterestDeleteResp)
        : undefined,
      regionOfInterestListReq: isSet(object.regionOfInterestListReq)
        ? RegionOfInterestListReq.fromJSON(object.regionOfInterestListReq)
        : undefined,
      regionOfInterestListResp: isSet(object.regionOfInterestListResp)
        ? RegionOfInterestListResp.fromJSON(object.regionOfInterestListResp)
        : undefined,
      regionOfInterestReq: isSet(object.regionOfInterestReq)
        ? RegionOfInterestReq.fromJSON(object.regionOfInterestReq)
        : undefined,
      regionOfInterestResp: isSet(object.regionOfInterestResp)
        ? RegionOfInterestResp.fromJSON(object.regionOfInterestResp)
        : undefined,
      regionOfInterestWriteReq: isSet(object.regionOfInterestWriteReq)
        ? RegionOfInterestWriteReq.fromJSON(object.regionOfInterestWriteReq)
        : undefined,
      regionOfInterestWriteResp: isSet(object.regionOfInterestWriteResp)
        ? RegionOfInterestWriteResp.fromJSON(object.regionOfInterestWriteResp)
        : undefined,
      runTestReq: isSet(object.runTestReq) ? RunTestReq.fromJSON(object.runTestReq) : undefined,
      runTestResp: isSet(object.runTestResp) ? RunTestResp.fromJSON(object.runTestResp) : undefined,
      scanImageLocationsReq: isSet(object.scanImageLocationsReq)
        ? ScanImageLocationsReq.fromJSON(object.scanImageLocationsReq)
        : undefined,
      scanImageLocationsResp: isSet(object.scanImageLocationsResp)
        ? ScanImageLocationsResp.fromJSON(object.scanImageLocationsResp)
        : undefined,
      scanListReq: isSet(object.scanListReq) ? ScanListReq.fromJSON(object.scanListReq) : undefined,
      scanListResp: isSet(object.scanListResp) ? ScanListResp.fromJSON(object.scanListResp) : undefined,
      scanListUpd: isSet(object.scanListUpd) ? ScanListUpd.fromJSON(object.scanListUpd) : undefined,
      scanLocationReq: isSet(object.scanLocationReq) ? ScanLocationReq.fromJSON(object.scanLocationReq) : undefined,
      scanLocationResp: isSet(object.scanLocationResp) ? ScanLocationResp.fromJSON(object.scanLocationResp) : undefined,
      scanMetaLabelsReq: isSet(object.scanMetaLabelsReq)
        ? ScanMetaLabelsReq.fromJSON(object.scanMetaLabelsReq)
        : undefined,
      scanMetaLabelsResp: isSet(object.scanMetaLabelsResp)
        ? ScanMetaLabelsResp.fromJSON(object.scanMetaLabelsResp)
        : undefined,
      scanMetaWriteReq: isSet(object.scanMetaWriteReq) ? ScanMetaWriteReq.fromJSON(object.scanMetaWriteReq) : undefined,
      scanMetaWriteResp: isSet(object.scanMetaWriteResp)
        ? ScanMetaWriteResp.fromJSON(object.scanMetaWriteResp)
        : undefined,
      scanTriggerReImportReq: isSet(object.scanTriggerReImportReq)
        ? ScanTriggerReImportReq.fromJSON(object.scanTriggerReImportReq)
        : undefined,
      scanTriggerReImportResp: isSet(object.scanTriggerReImportResp)
        ? ScanTriggerReImportResp.fromJSON(object.scanTriggerReImportResp)
        : undefined,
      scanUploadReq: isSet(object.scanUploadReq) ? ScanUploadReq.fromJSON(object.scanUploadReq) : undefined,
      scanUploadResp: isSet(object.scanUploadResp) ? ScanUploadResp.fromJSON(object.scanUploadResp) : undefined,
      sendUserNotificationReq: isSet(object.sendUserNotificationReq)
        ? SendUserNotificationReq.fromJSON(object.sendUserNotificationReq)
        : undefined,
      sendUserNotificationResp: isSet(object.sendUserNotificationResp)
        ? SendUserNotificationResp.fromJSON(object.sendUserNotificationResp)
        : undefined,
      spectrumReq: isSet(object.spectrumReq) ? SpectrumReq.fromJSON(object.spectrumReq) : undefined,
      spectrumResp: isSet(object.spectrumResp) ? SpectrumResp.fromJSON(object.spectrumResp) : undefined,
      tagCreateReq: isSet(object.tagCreateReq) ? TagCreateReq.fromJSON(object.tagCreateReq) : undefined,
      tagCreateResp: isSet(object.tagCreateResp) ? TagCreateResp.fromJSON(object.tagCreateResp) : undefined,
      tagDeleteReq: isSet(object.tagDeleteReq) ? TagDeleteReq.fromJSON(object.tagDeleteReq) : undefined,
      tagDeleteResp: isSet(object.tagDeleteResp) ? TagDeleteResp.fromJSON(object.tagDeleteResp) : undefined,
      tagListReq: isSet(object.tagListReq) ? TagListReq.fromJSON(object.tagListReq) : undefined,
      tagListResp: isSet(object.tagListResp) ? TagListResp.fromJSON(object.tagListResp) : undefined,
      userAddRoleReq: isSet(object.userAddRoleReq) ? UserAddRoleReq.fromJSON(object.userAddRoleReq) : undefined,
      userAddRoleResp: isSet(object.userAddRoleResp) ? UserAddRoleResp.fromJSON(object.userAddRoleResp) : undefined,
      userDeleteRoleReq: isSet(object.userDeleteRoleReq)
        ? UserDeleteRoleReq.fromJSON(object.userDeleteRoleReq)
        : undefined,
      userDeleteRoleResp: isSet(object.userDeleteRoleResp)
        ? UserDeleteRoleResp.fromJSON(object.userDeleteRoleResp)
        : undefined,
      userDetailsReq: isSet(object.userDetailsReq) ? UserDetailsReq.fromJSON(object.userDetailsReq) : undefined,
      userDetailsResp: isSet(object.userDetailsResp) ? UserDetailsResp.fromJSON(object.userDetailsResp) : undefined,
      userDetailsUpd: isSet(object.userDetailsUpd) ? UserDetailsUpd.fromJSON(object.userDetailsUpd) : undefined,
      userDetailsWriteReq: isSet(object.userDetailsWriteReq)
        ? UserDetailsWriteReq.fromJSON(object.userDetailsWriteReq)
        : undefined,
      userDetailsWriteResp: isSet(object.userDetailsWriteResp)
        ? UserDetailsWriteResp.fromJSON(object.userDetailsWriteResp)
        : undefined,
      userDismissHintReq: isSet(object.userDismissHintReq)
        ? UserDismissHintReq.fromJSON(object.userDismissHintReq)
        : undefined,
      userDismissHintResp: isSet(object.userDismissHintResp)
        ? UserDismissHintResp.fromJSON(object.userDismissHintResp)
        : undefined,
      userHintsReq: isSet(object.userHintsReq) ? UserHintsReq.fromJSON(object.userHintsReq) : undefined,
      userHintsResp: isSet(object.userHintsResp) ? UserHintsResp.fromJSON(object.userHintsResp) : undefined,
      userHintsToggleReq: isSet(object.userHintsToggleReq)
        ? UserHintsToggleReq.fromJSON(object.userHintsToggleReq)
        : undefined,
      userHintsToggleResp: isSet(object.userHintsToggleResp)
        ? UserHintsToggleResp.fromJSON(object.userHintsToggleResp)
        : undefined,
      userHintsUpd: isSet(object.userHintsUpd) ? UserHintsUpd.fromJSON(object.userHintsUpd) : undefined,
      userListReq: isSet(object.userListReq) ? UserListReq.fromJSON(object.userListReq) : undefined,
      userListResp: isSet(object.userListResp) ? UserListResp.fromJSON(object.userListResp) : undefined,
      userNotificationReq: isSet(object.userNotificationReq)
        ? UserNotificationReq.fromJSON(object.userNotificationReq)
        : undefined,
      userNotificationResp: isSet(object.userNotificationResp)
        ? UserNotificationResp.fromJSON(object.userNotificationResp)
        : undefined,
      userNotificationSettingsReq: isSet(object.userNotificationSettingsReq)
        ? UserNotificationSettingsReq.fromJSON(object.userNotificationSettingsReq)
        : undefined,
      userNotificationSettingsResp: isSet(object.userNotificationSettingsResp)
        ? UserNotificationSettingsResp.fromJSON(object.userNotificationSettingsResp)
        : undefined,
      userNotificationSettingsUpd: isSet(object.userNotificationSettingsUpd)
        ? UserNotificationSettingsUpd.fromJSON(object.userNotificationSettingsUpd)
        : undefined,
      userNotificationSettingsWriteReq: isSet(object.userNotificationSettingsWriteReq)
        ? UserNotificationSettingsWriteReq.fromJSON(object.userNotificationSettingsWriteReq)
        : undefined,
      userNotificationSettingsWriteResp: isSet(object.userNotificationSettingsWriteResp)
        ? UserNotificationSettingsWriteResp.fromJSON(object.userNotificationSettingsWriteResp)
        : undefined,
      userNotificationUpd: isSet(object.userNotificationUpd)
        ? UserNotificationUpd.fromJSON(object.userNotificationUpd)
        : undefined,
      userRoleListReq: isSet(object.userRoleListReq) ? UserRoleListReq.fromJSON(object.userRoleListReq) : undefined,
      userRoleListResp: isSet(object.userRoleListResp) ? UserRoleListResp.fromJSON(object.userRoleListResp) : undefined,
      userRolesListReq: isSet(object.userRolesListReq) ? UserRolesListReq.fromJSON(object.userRolesListReq) : undefined,
      userRolesListResp: isSet(object.userRolesListResp)
        ? UserRolesListResp.fromJSON(object.userRolesListResp)
        : undefined,
    };
  },

  toJSON(message: WSMessage): unknown {
    const obj: any = {};
    message.msgId !== undefined && (obj.msgId = Math.round(message.msgId));
    message.dataModuleListReq !== undefined && (obj.dataModuleListReq = message.dataModuleListReq
      ? DataModuleListReq.toJSON(message.dataModuleListReq)
      : undefined);
    message.dataModuleListResp !== undefined && (obj.dataModuleListResp = message.dataModuleListResp
      ? DataModuleListResp.toJSON(message.dataModuleListResp)
      : undefined);
    message.dataModuleReq !== undefined &&
      (obj.dataModuleReq = message.dataModuleReq ? DataModuleReq.toJSON(message.dataModuleReq) : undefined);
    message.dataModuleResp !== undefined &&
      (obj.dataModuleResp = message.dataModuleResp ? DataModuleResp.toJSON(message.dataModuleResp) : undefined);
    message.dataModuleWriteReq !== undefined && (obj.dataModuleWriteReq = message.dataModuleWriteReq
      ? DataModuleWriteReq.toJSON(message.dataModuleWriteReq)
      : undefined);
    message.dataModuleWriteResp !== undefined && (obj.dataModuleWriteResp = message.dataModuleWriteResp
      ? DataModuleWriteResp.toJSON(message.dataModuleWriteResp)
      : undefined);
    message.detectorConfigReq !== undefined && (obj.detectorConfigReq = message.detectorConfigReq
      ? DetectorConfigReq.toJSON(message.detectorConfigReq)
      : undefined);
    message.detectorConfigResp !== undefined && (obj.detectorConfigResp = message.detectorConfigResp
      ? DetectorConfigResp.toJSON(message.detectorConfigResp)
      : undefined);
    message.diffractionPeakManualDeleteReq !== undefined &&
      (obj.diffractionPeakManualDeleteReq = message.diffractionPeakManualDeleteReq
        ? DiffractionPeakManualDeleteReq.toJSON(message.diffractionPeakManualDeleteReq)
        : undefined);
    message.diffractionPeakManualDeleteResp !== undefined &&
      (obj.diffractionPeakManualDeleteResp = message.diffractionPeakManualDeleteResp
        ? DiffractionPeakManualDeleteResp.toJSON(message.diffractionPeakManualDeleteResp)
        : undefined);
    message.diffractionPeakManualListReq !== undefined &&
      (obj.diffractionPeakManualListReq = message.diffractionPeakManualListReq
        ? DiffractionPeakManualListReq.toJSON(message.diffractionPeakManualListReq)
        : undefined);
    message.diffractionPeakManualListResp !== undefined &&
      (obj.diffractionPeakManualListResp = message.diffractionPeakManualListResp
        ? DiffractionPeakManualListResp.toJSON(message.diffractionPeakManualListResp)
        : undefined);
    message.diffractionPeakManualWriteReq !== undefined &&
      (obj.diffractionPeakManualWriteReq = message.diffractionPeakManualWriteReq
        ? DiffractionPeakManualWriteReq.toJSON(message.diffractionPeakManualWriteReq)
        : undefined);
    message.diffractionPeakManualWriteResp !== undefined &&
      (obj.diffractionPeakManualWriteResp = message.diffractionPeakManualWriteResp
        ? DiffractionPeakManualWriteResp.toJSON(message.diffractionPeakManualWriteResp)
        : undefined);
    message.diffractionPeakStatusDeleteReq !== undefined &&
      (obj.diffractionPeakStatusDeleteReq = message.diffractionPeakStatusDeleteReq
        ? DiffractionPeakStatusDeleteReq.toJSON(message.diffractionPeakStatusDeleteReq)
        : undefined);
    message.diffractionPeakStatusDeleteResp !== undefined &&
      (obj.diffractionPeakStatusDeleteResp = message.diffractionPeakStatusDeleteResp
        ? DiffractionPeakStatusDeleteResp.toJSON(message.diffractionPeakStatusDeleteResp)
        : undefined);
    message.diffractionPeakStatusListReq !== undefined &&
      (obj.diffractionPeakStatusListReq = message.diffractionPeakStatusListReq
        ? DiffractionPeakStatusListReq.toJSON(message.diffractionPeakStatusListReq)
        : undefined);
    message.diffractionPeakStatusListResp !== undefined &&
      (obj.diffractionPeakStatusListResp = message.diffractionPeakStatusListResp
        ? DiffractionPeakStatusListResp.toJSON(message.diffractionPeakStatusListResp)
        : undefined);
    message.diffractionPeakStatusWriteReq !== undefined &&
      (obj.diffractionPeakStatusWriteReq = message.diffractionPeakStatusWriteReq
        ? DiffractionPeakStatusWriteReq.toJSON(message.diffractionPeakStatusWriteReq)
        : undefined);
    message.diffractionPeakStatusWriteResp !== undefined &&
      (obj.diffractionPeakStatusWriteResp = message.diffractionPeakStatusWriteResp
        ? DiffractionPeakStatusWriteResp.toJSON(message.diffractionPeakStatusWriteResp)
        : undefined);
    message.elementSetDeleteReq !== undefined && (obj.elementSetDeleteReq = message.elementSetDeleteReq
      ? ElementSetDeleteReq.toJSON(message.elementSetDeleteReq)
      : undefined);
    message.elementSetDeleteResp !== undefined && (obj.elementSetDeleteResp = message.elementSetDeleteResp
      ? ElementSetDeleteResp.toJSON(message.elementSetDeleteResp)
      : undefined);
    message.elementSetGetReq !== undefined &&
      (obj.elementSetGetReq = message.elementSetGetReq ? ElementSetGetReq.toJSON(message.elementSetGetReq) : undefined);
    message.elementSetGetResp !== undefined && (obj.elementSetGetResp = message.elementSetGetResp
      ? ElementSetGetResp.toJSON(message.elementSetGetResp)
      : undefined);
    message.elementSetListReq !== undefined && (obj.elementSetListReq = message.elementSetListReq
      ? ElementSetListReq.toJSON(message.elementSetListReq)
      : undefined);
    message.elementSetListResp !== undefined && (obj.elementSetListResp = message.elementSetListResp
      ? ElementSetListResp.toJSON(message.elementSetListResp)
      : undefined);
    message.elementSetWriteReq !== undefined && (obj.elementSetWriteReq = message.elementSetWriteReq
      ? ElementSetWriteReq.toJSON(message.elementSetWriteReq)
      : undefined);
    message.elementSetWriteResp !== undefined && (obj.elementSetWriteResp = message.elementSetWriteResp
      ? ElementSetWriteResp.toJSON(message.elementSetWriteResp)
      : undefined);
    message.exportFilesReq !== undefined &&
      (obj.exportFilesReq = message.exportFilesReq ? ExportFilesReq.toJSON(message.exportFilesReq) : undefined);
    message.exportFilesResp !== undefined &&
      (obj.exportFilesResp = message.exportFilesResp ? ExportFilesResp.toJSON(message.exportFilesResp) : undefined);
    message.expressionDeleteReq !== undefined && (obj.expressionDeleteReq = message.expressionDeleteReq
      ? ExpressionDeleteReq.toJSON(message.expressionDeleteReq)
      : undefined);
    message.expressionDeleteResp !== undefined && (obj.expressionDeleteResp = message.expressionDeleteResp
      ? ExpressionDeleteResp.toJSON(message.expressionDeleteResp)
      : undefined);
    message.expressionGroupDeleteReq !== undefined && (obj.expressionGroupDeleteReq = message.expressionGroupDeleteReq
      ? ExpressionGroupDeleteReq.toJSON(message.expressionGroupDeleteReq)
      : undefined);
    message.expressionGroupDeleteResp !== undefined &&
      (obj.expressionGroupDeleteResp = message.expressionGroupDeleteResp
        ? ExpressionGroupDeleteResp.toJSON(message.expressionGroupDeleteResp)
        : undefined);
    message.expressionGroupListReq !== undefined && (obj.expressionGroupListReq = message.expressionGroupListReq
      ? ExpressionGroupListReq.toJSON(message.expressionGroupListReq)
      : undefined);
    message.expressionGroupListResp !== undefined && (obj.expressionGroupListResp = message.expressionGroupListResp
      ? ExpressionGroupListResp.toJSON(message.expressionGroupListResp)
      : undefined);
    message.expressionGroupSetReq !== undefined && (obj.expressionGroupSetReq = message.expressionGroupSetReq
      ? ExpressionGroupSetReq.toJSON(message.expressionGroupSetReq)
      : undefined);
    message.expressionGroupSetResp !== undefined && (obj.expressionGroupSetResp = message.expressionGroupSetResp
      ? ExpressionGroupSetResp.toJSON(message.expressionGroupSetResp)
      : undefined);
    message.expressionListReq !== undefined && (obj.expressionListReq = message.expressionListReq
      ? ExpressionListReq.toJSON(message.expressionListReq)
      : undefined);
    message.expressionListResp !== undefined && (obj.expressionListResp = message.expressionListResp
      ? ExpressionListResp.toJSON(message.expressionListResp)
      : undefined);
    message.expressionReq !== undefined &&
      (obj.expressionReq = message.expressionReq ? ExpressionReq.toJSON(message.expressionReq) : undefined);
    message.expressionResp !== undefined &&
      (obj.expressionResp = message.expressionResp ? ExpressionResp.toJSON(message.expressionResp) : undefined);
    message.expressionWriteExecStatReq !== undefined &&
      (obj.expressionWriteExecStatReq = message.expressionWriteExecStatReq
        ? ExpressionWriteExecStatReq.toJSON(message.expressionWriteExecStatReq)
        : undefined);
    message.expressionWriteExecStatResp !== undefined &&
      (obj.expressionWriteExecStatResp = message.expressionWriteExecStatResp
        ? ExpressionWriteExecStatResp.toJSON(message.expressionWriteExecStatResp)
        : undefined);
    message.expressionWriteReq !== undefined && (obj.expressionWriteReq = message.expressionWriteReq
      ? ExpressionWriteReq.toJSON(message.expressionWriteReq)
      : undefined);
    message.expressionWriteResp !== undefined && (obj.expressionWriteResp = message.expressionWriteResp
      ? ExpressionWriteResp.toJSON(message.expressionWriteResp)
      : undefined);
    message.expressionWriteResultReq !== undefined && (obj.expressionWriteResultReq = message.expressionWriteResultReq
      ? ExpressionWriteResultReq.toJSON(message.expressionWriteResultReq)
      : undefined);
    message.expressionWriteResultResp !== undefined &&
      (obj.expressionWriteResultResp = message.expressionWriteResultResp
        ? ExpressionWriteResultResp.toJSON(message.expressionWriteResultResp)
        : undefined);
    message.imageDeleteReq !== undefined &&
      (obj.imageDeleteReq = message.imageDeleteReq ? ImageDeleteReq.toJSON(message.imageDeleteReq) : undefined);
    message.imageDeleteResp !== undefined &&
      (obj.imageDeleteResp = message.imageDeleteResp ? ImageDeleteResp.toJSON(message.imageDeleteResp) : undefined);
    message.imageListReq !== undefined &&
      (obj.imageListReq = message.imageListReq ? ImageListReq.toJSON(message.imageListReq) : undefined);
    message.imageListResp !== undefined &&
      (obj.imageListResp = message.imageListResp ? ImageListResp.toJSON(message.imageListResp) : undefined);
    message.imageListUpd !== undefined &&
      (obj.imageListUpd = message.imageListUpd ? ImageListUpd.toJSON(message.imageListUpd) : undefined);
    message.imageSetDefaultReq !== undefined && (obj.imageSetDefaultReq = message.imageSetDefaultReq
      ? ImageSetDefaultReq.toJSON(message.imageSetDefaultReq)
      : undefined);
    message.imageSetDefaultResp !== undefined && (obj.imageSetDefaultResp = message.imageSetDefaultResp
      ? ImageSetDefaultResp.toJSON(message.imageSetDefaultResp)
      : undefined);
    message.imageUploadReq !== undefined &&
      (obj.imageUploadReq = message.imageUploadReq ? ImageUploadReq.toJSON(message.imageUploadReq) : undefined);
    message.imageUploadResp !== undefined &&
      (obj.imageUploadResp = message.imageUploadResp ? ImageUploadResp.toJSON(message.imageUploadResp) : undefined);
    message.logGetLevelReq !== undefined &&
      (obj.logGetLevelReq = message.logGetLevelReq ? LogGetLevelReq.toJSON(message.logGetLevelReq) : undefined);
    message.logGetLevelResp !== undefined &&
      (obj.logGetLevelResp = message.logGetLevelResp ? LogGetLevelResp.toJSON(message.logGetLevelResp) : undefined);
    message.logReadReq !== undefined &&
      (obj.logReadReq = message.logReadReq ? LogReadReq.toJSON(message.logReadReq) : undefined);
    message.logReadResp !== undefined &&
      (obj.logReadResp = message.logReadResp ? LogReadResp.toJSON(message.logReadResp) : undefined);
    message.logSetLevelReq !== undefined &&
      (obj.logSetLevelReq = message.logSetLevelReq ? LogSetLevelReq.toJSON(message.logSetLevelReq) : undefined);
    message.logSetLevelResp !== undefined &&
      (obj.logSetLevelResp = message.logSetLevelResp ? LogSetLevelResp.toJSON(message.logSetLevelResp) : undefined);
    message.piquantConfigListReq !== undefined && (obj.piquantConfigListReq = message.piquantConfigListReq
      ? PiquantConfigListReq.toJSON(message.piquantConfigListReq)
      : undefined);
    message.piquantConfigListResp !== undefined && (obj.piquantConfigListResp = message.piquantConfigListResp
      ? PiquantConfigListResp.toJSON(message.piquantConfigListResp)
      : undefined);
    message.piquantConfigVersionReq !== undefined && (obj.piquantConfigVersionReq = message.piquantConfigVersionReq
      ? PiquantConfigVersionReq.toJSON(message.piquantConfigVersionReq)
      : undefined);
    message.piquantConfigVersionResp !== undefined && (obj.piquantConfigVersionResp = message.piquantConfigVersionResp
      ? PiquantConfigVersionResp.toJSON(message.piquantConfigVersionResp)
      : undefined);
    message.piquantConfigVersionsListReq !== undefined &&
      (obj.piquantConfigVersionsListReq = message.piquantConfigVersionsListReq
        ? PiquantConfigVersionsListReq.toJSON(message.piquantConfigVersionsListReq)
        : undefined);
    message.piquantConfigVersionsListResp !== undefined &&
      (obj.piquantConfigVersionsListResp = message.piquantConfigVersionsListResp
        ? PiquantConfigVersionsListResp.toJSON(message.piquantConfigVersionsListResp)
        : undefined);
    message.piquantSetVersionReq !== undefined && (obj.piquantSetVersionReq = message.piquantSetVersionReq
      ? PiquantSetVersionReq.toJSON(message.piquantSetVersionReq)
      : undefined);
    message.piquantSetVersionResp !== undefined && (obj.piquantSetVersionResp = message.piquantSetVersionResp
      ? PiquantSetVersionResp.toJSON(message.piquantSetVersionResp)
      : undefined);
    message.piquantVersionListReq !== undefined && (obj.piquantVersionListReq = message.piquantVersionListReq
      ? PiquantVersionListReq.toJSON(message.piquantVersionListReq)
      : undefined);
    message.piquantVersionListResp !== undefined && (obj.piquantVersionListResp = message.piquantVersionListResp
      ? PiquantVersionListResp.toJSON(message.piquantVersionListResp)
      : undefined);
    message.pseudoIntensityReq !== undefined && (obj.pseudoIntensityReq = message.pseudoIntensityReq
      ? PseudoIntensityReq.toJSON(message.pseudoIntensityReq)
      : undefined);
    message.pseudoIntensityResp !== undefined && (obj.pseudoIntensityResp = message.pseudoIntensityResp
      ? PseudoIntensityResp.toJSON(message.pseudoIntensityResp)
      : undefined);
    message.regionOfInterestDeleteReq !== undefined &&
      (obj.regionOfInterestDeleteReq = message.regionOfInterestDeleteReq
        ? RegionOfInterestDeleteReq.toJSON(message.regionOfInterestDeleteReq)
        : undefined);
    message.regionOfInterestDeleteResp !== undefined &&
      (obj.regionOfInterestDeleteResp = message.regionOfInterestDeleteResp
        ? RegionOfInterestDeleteResp.toJSON(message.regionOfInterestDeleteResp)
        : undefined);
    message.regionOfInterestListReq !== undefined && (obj.regionOfInterestListReq = message.regionOfInterestListReq
      ? RegionOfInterestListReq.toJSON(message.regionOfInterestListReq)
      : undefined);
    message.regionOfInterestListResp !== undefined && (obj.regionOfInterestListResp = message.regionOfInterestListResp
      ? RegionOfInterestListResp.toJSON(message.regionOfInterestListResp)
      : undefined);
    message.regionOfInterestReq !== undefined && (obj.regionOfInterestReq = message.regionOfInterestReq
      ? RegionOfInterestReq.toJSON(message.regionOfInterestReq)
      : undefined);
    message.regionOfInterestResp !== undefined && (obj.regionOfInterestResp = message.regionOfInterestResp
      ? RegionOfInterestResp.toJSON(message.regionOfInterestResp)
      : undefined);
    message.regionOfInterestWriteReq !== undefined && (obj.regionOfInterestWriteReq = message.regionOfInterestWriteReq
      ? RegionOfInterestWriteReq.toJSON(message.regionOfInterestWriteReq)
      : undefined);
    message.regionOfInterestWriteResp !== undefined &&
      (obj.regionOfInterestWriteResp = message.regionOfInterestWriteResp
        ? RegionOfInterestWriteResp.toJSON(message.regionOfInterestWriteResp)
        : undefined);
    message.runTestReq !== undefined &&
      (obj.runTestReq = message.runTestReq ? RunTestReq.toJSON(message.runTestReq) : undefined);
    message.runTestResp !== undefined &&
      (obj.runTestResp = message.runTestResp ? RunTestResp.toJSON(message.runTestResp) : undefined);
    message.scanImageLocationsReq !== undefined && (obj.scanImageLocationsReq = message.scanImageLocationsReq
      ? ScanImageLocationsReq.toJSON(message.scanImageLocationsReq)
      : undefined);
    message.scanImageLocationsResp !== undefined && (obj.scanImageLocationsResp = message.scanImageLocationsResp
      ? ScanImageLocationsResp.toJSON(message.scanImageLocationsResp)
      : undefined);
    message.scanListReq !== undefined &&
      (obj.scanListReq = message.scanListReq ? ScanListReq.toJSON(message.scanListReq) : undefined);
    message.scanListResp !== undefined &&
      (obj.scanListResp = message.scanListResp ? ScanListResp.toJSON(message.scanListResp) : undefined);
    message.scanListUpd !== undefined &&
      (obj.scanListUpd = message.scanListUpd ? ScanListUpd.toJSON(message.scanListUpd) : undefined);
    message.scanLocationReq !== undefined &&
      (obj.scanLocationReq = message.scanLocationReq ? ScanLocationReq.toJSON(message.scanLocationReq) : undefined);
    message.scanLocationResp !== undefined &&
      (obj.scanLocationResp = message.scanLocationResp ? ScanLocationResp.toJSON(message.scanLocationResp) : undefined);
    message.scanMetaLabelsReq !== undefined && (obj.scanMetaLabelsReq = message.scanMetaLabelsReq
      ? ScanMetaLabelsReq.toJSON(message.scanMetaLabelsReq)
      : undefined);
    message.scanMetaLabelsResp !== undefined && (obj.scanMetaLabelsResp = message.scanMetaLabelsResp
      ? ScanMetaLabelsResp.toJSON(message.scanMetaLabelsResp)
      : undefined);
    message.scanMetaWriteReq !== undefined &&
      (obj.scanMetaWriteReq = message.scanMetaWriteReq ? ScanMetaWriteReq.toJSON(message.scanMetaWriteReq) : undefined);
    message.scanMetaWriteResp !== undefined && (obj.scanMetaWriteResp = message.scanMetaWriteResp
      ? ScanMetaWriteResp.toJSON(message.scanMetaWriteResp)
      : undefined);
    message.scanTriggerReImportReq !== undefined && (obj.scanTriggerReImportReq = message.scanTriggerReImportReq
      ? ScanTriggerReImportReq.toJSON(message.scanTriggerReImportReq)
      : undefined);
    message.scanTriggerReImportResp !== undefined && (obj.scanTriggerReImportResp = message.scanTriggerReImportResp
      ? ScanTriggerReImportResp.toJSON(message.scanTriggerReImportResp)
      : undefined);
    message.scanUploadReq !== undefined &&
      (obj.scanUploadReq = message.scanUploadReq ? ScanUploadReq.toJSON(message.scanUploadReq) : undefined);
    message.scanUploadResp !== undefined &&
      (obj.scanUploadResp = message.scanUploadResp ? ScanUploadResp.toJSON(message.scanUploadResp) : undefined);
    message.sendUserNotificationReq !== undefined && (obj.sendUserNotificationReq = message.sendUserNotificationReq
      ? SendUserNotificationReq.toJSON(message.sendUserNotificationReq)
      : undefined);
    message.sendUserNotificationResp !== undefined && (obj.sendUserNotificationResp = message.sendUserNotificationResp
      ? SendUserNotificationResp.toJSON(message.sendUserNotificationResp)
      : undefined);
    message.spectrumReq !== undefined &&
      (obj.spectrumReq = message.spectrumReq ? SpectrumReq.toJSON(message.spectrumReq) : undefined);
    message.spectrumResp !== undefined &&
      (obj.spectrumResp = message.spectrumResp ? SpectrumResp.toJSON(message.spectrumResp) : undefined);
    message.tagCreateReq !== undefined &&
      (obj.tagCreateReq = message.tagCreateReq ? TagCreateReq.toJSON(message.tagCreateReq) : undefined);
    message.tagCreateResp !== undefined &&
      (obj.tagCreateResp = message.tagCreateResp ? TagCreateResp.toJSON(message.tagCreateResp) : undefined);
    message.tagDeleteReq !== undefined &&
      (obj.tagDeleteReq = message.tagDeleteReq ? TagDeleteReq.toJSON(message.tagDeleteReq) : undefined);
    message.tagDeleteResp !== undefined &&
      (obj.tagDeleteResp = message.tagDeleteResp ? TagDeleteResp.toJSON(message.tagDeleteResp) : undefined);
    message.tagListReq !== undefined &&
      (obj.tagListReq = message.tagListReq ? TagListReq.toJSON(message.tagListReq) : undefined);
    message.tagListResp !== undefined &&
      (obj.tagListResp = message.tagListResp ? TagListResp.toJSON(message.tagListResp) : undefined);
    message.userAddRoleReq !== undefined &&
      (obj.userAddRoleReq = message.userAddRoleReq ? UserAddRoleReq.toJSON(message.userAddRoleReq) : undefined);
    message.userAddRoleResp !== undefined &&
      (obj.userAddRoleResp = message.userAddRoleResp ? UserAddRoleResp.toJSON(message.userAddRoleResp) : undefined);
    message.userDeleteRoleReq !== undefined && (obj.userDeleteRoleReq = message.userDeleteRoleReq
      ? UserDeleteRoleReq.toJSON(message.userDeleteRoleReq)
      : undefined);
    message.userDeleteRoleResp !== undefined && (obj.userDeleteRoleResp = message.userDeleteRoleResp
      ? UserDeleteRoleResp.toJSON(message.userDeleteRoleResp)
      : undefined);
    message.userDetailsReq !== undefined &&
      (obj.userDetailsReq = message.userDetailsReq ? UserDetailsReq.toJSON(message.userDetailsReq) : undefined);
    message.userDetailsResp !== undefined &&
      (obj.userDetailsResp = message.userDetailsResp ? UserDetailsResp.toJSON(message.userDetailsResp) : undefined);
    message.userDetailsUpd !== undefined &&
      (obj.userDetailsUpd = message.userDetailsUpd ? UserDetailsUpd.toJSON(message.userDetailsUpd) : undefined);
    message.userDetailsWriteReq !== undefined && (obj.userDetailsWriteReq = message.userDetailsWriteReq
      ? UserDetailsWriteReq.toJSON(message.userDetailsWriteReq)
      : undefined);
    message.userDetailsWriteResp !== undefined && (obj.userDetailsWriteResp = message.userDetailsWriteResp
      ? UserDetailsWriteResp.toJSON(message.userDetailsWriteResp)
      : undefined);
    message.userDismissHintReq !== undefined && (obj.userDismissHintReq = message.userDismissHintReq
      ? UserDismissHintReq.toJSON(message.userDismissHintReq)
      : undefined);
    message.userDismissHintResp !== undefined && (obj.userDismissHintResp = message.userDismissHintResp
      ? UserDismissHintResp.toJSON(message.userDismissHintResp)
      : undefined);
    message.userHintsReq !== undefined &&
      (obj.userHintsReq = message.userHintsReq ? UserHintsReq.toJSON(message.userHintsReq) : undefined);
    message.userHintsResp !== undefined &&
      (obj.userHintsResp = message.userHintsResp ? UserHintsResp.toJSON(message.userHintsResp) : undefined);
    message.userHintsToggleReq !== undefined && (obj.userHintsToggleReq = message.userHintsToggleReq
      ? UserHintsToggleReq.toJSON(message.userHintsToggleReq)
      : undefined);
    message.userHintsToggleResp !== undefined && (obj.userHintsToggleResp = message.userHintsToggleResp
      ? UserHintsToggleResp.toJSON(message.userHintsToggleResp)
      : undefined);
    message.userHintsUpd !== undefined &&
      (obj.userHintsUpd = message.userHintsUpd ? UserHintsUpd.toJSON(message.userHintsUpd) : undefined);
    message.userListReq !== undefined &&
      (obj.userListReq = message.userListReq ? UserListReq.toJSON(message.userListReq) : undefined);
    message.userListResp !== undefined &&
      (obj.userListResp = message.userListResp ? UserListResp.toJSON(message.userListResp) : undefined);
    message.userNotificationReq !== undefined && (obj.userNotificationReq = message.userNotificationReq
      ? UserNotificationReq.toJSON(message.userNotificationReq)
      : undefined);
    message.userNotificationResp !== undefined && (obj.userNotificationResp = message.userNotificationResp
      ? UserNotificationResp.toJSON(message.userNotificationResp)
      : undefined);
    message.userNotificationSettingsReq !== undefined &&
      (obj.userNotificationSettingsReq = message.userNotificationSettingsReq
        ? UserNotificationSettingsReq.toJSON(message.userNotificationSettingsReq)
        : undefined);
    message.userNotificationSettingsResp !== undefined &&
      (obj.userNotificationSettingsResp = message.userNotificationSettingsResp
        ? UserNotificationSettingsResp.toJSON(message.userNotificationSettingsResp)
        : undefined);
    message.userNotificationSettingsUpd !== undefined &&
      (obj.userNotificationSettingsUpd = message.userNotificationSettingsUpd
        ? UserNotificationSettingsUpd.toJSON(message.userNotificationSettingsUpd)
        : undefined);
    message.userNotificationSettingsWriteReq !== undefined &&
      (obj.userNotificationSettingsWriteReq = message.userNotificationSettingsWriteReq
        ? UserNotificationSettingsWriteReq.toJSON(message.userNotificationSettingsWriteReq)
        : undefined);
    message.userNotificationSettingsWriteResp !== undefined &&
      (obj.userNotificationSettingsWriteResp = message.userNotificationSettingsWriteResp
        ? UserNotificationSettingsWriteResp.toJSON(message.userNotificationSettingsWriteResp)
        : undefined);
    message.userNotificationUpd !== undefined && (obj.userNotificationUpd = message.userNotificationUpd
      ? UserNotificationUpd.toJSON(message.userNotificationUpd)
      : undefined);
    message.userRoleListReq !== undefined &&
      (obj.userRoleListReq = message.userRoleListReq ? UserRoleListReq.toJSON(message.userRoleListReq) : undefined);
    message.userRoleListResp !== undefined &&
      (obj.userRoleListResp = message.userRoleListResp ? UserRoleListResp.toJSON(message.userRoleListResp) : undefined);
    message.userRolesListReq !== undefined &&
      (obj.userRolesListReq = message.userRolesListReq ? UserRolesListReq.toJSON(message.userRolesListReq) : undefined);
    message.userRolesListResp !== undefined && (obj.userRolesListResp = message.userRolesListResp
      ? UserRolesListResp.toJSON(message.userRolesListResp)
      : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<WSMessage>, I>>(base?: I): WSMessage {
    return WSMessage.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<WSMessage>, I>>(object: I): WSMessage {
    const message = createBaseWSMessage();
    message.msgId = object.msgId ?? 0;
    message.dataModuleListReq = (object.dataModuleListReq !== undefined && object.dataModuleListReq !== null)
      ? DataModuleListReq.fromPartial(object.dataModuleListReq)
      : undefined;
    message.dataModuleListResp = (object.dataModuleListResp !== undefined && object.dataModuleListResp !== null)
      ? DataModuleListResp.fromPartial(object.dataModuleListResp)
      : undefined;
    message.dataModuleReq = (object.dataModuleReq !== undefined && object.dataModuleReq !== null)
      ? DataModuleReq.fromPartial(object.dataModuleReq)
      : undefined;
    message.dataModuleResp = (object.dataModuleResp !== undefined && object.dataModuleResp !== null)
      ? DataModuleResp.fromPartial(object.dataModuleResp)
      : undefined;
    message.dataModuleWriteReq = (object.dataModuleWriteReq !== undefined && object.dataModuleWriteReq !== null)
      ? DataModuleWriteReq.fromPartial(object.dataModuleWriteReq)
      : undefined;
    message.dataModuleWriteResp = (object.dataModuleWriteResp !== undefined && object.dataModuleWriteResp !== null)
      ? DataModuleWriteResp.fromPartial(object.dataModuleWriteResp)
      : undefined;
    message.detectorConfigReq = (object.detectorConfigReq !== undefined && object.detectorConfigReq !== null)
      ? DetectorConfigReq.fromPartial(object.detectorConfigReq)
      : undefined;
    message.detectorConfigResp = (object.detectorConfigResp !== undefined && object.detectorConfigResp !== null)
      ? DetectorConfigResp.fromPartial(object.detectorConfigResp)
      : undefined;
    message.diffractionPeakManualDeleteReq =
      (object.diffractionPeakManualDeleteReq !== undefined && object.diffractionPeakManualDeleteReq !== null)
        ? DiffractionPeakManualDeleteReq.fromPartial(object.diffractionPeakManualDeleteReq)
        : undefined;
    message.diffractionPeakManualDeleteResp =
      (object.diffractionPeakManualDeleteResp !== undefined && object.diffractionPeakManualDeleteResp !== null)
        ? DiffractionPeakManualDeleteResp.fromPartial(object.diffractionPeakManualDeleteResp)
        : undefined;
    message.diffractionPeakManualListReq =
      (object.diffractionPeakManualListReq !== undefined && object.diffractionPeakManualListReq !== null)
        ? DiffractionPeakManualListReq.fromPartial(object.diffractionPeakManualListReq)
        : undefined;
    message.diffractionPeakManualListResp =
      (object.diffractionPeakManualListResp !== undefined && object.diffractionPeakManualListResp !== null)
        ? DiffractionPeakManualListResp.fromPartial(object.diffractionPeakManualListResp)
        : undefined;
    message.diffractionPeakManualWriteReq =
      (object.diffractionPeakManualWriteReq !== undefined && object.diffractionPeakManualWriteReq !== null)
        ? DiffractionPeakManualWriteReq.fromPartial(object.diffractionPeakManualWriteReq)
        : undefined;
    message.diffractionPeakManualWriteResp =
      (object.diffractionPeakManualWriteResp !== undefined && object.diffractionPeakManualWriteResp !== null)
        ? DiffractionPeakManualWriteResp.fromPartial(object.diffractionPeakManualWriteResp)
        : undefined;
    message.diffractionPeakStatusDeleteReq =
      (object.diffractionPeakStatusDeleteReq !== undefined && object.diffractionPeakStatusDeleteReq !== null)
        ? DiffractionPeakStatusDeleteReq.fromPartial(object.diffractionPeakStatusDeleteReq)
        : undefined;
    message.diffractionPeakStatusDeleteResp =
      (object.diffractionPeakStatusDeleteResp !== undefined && object.diffractionPeakStatusDeleteResp !== null)
        ? DiffractionPeakStatusDeleteResp.fromPartial(object.diffractionPeakStatusDeleteResp)
        : undefined;
    message.diffractionPeakStatusListReq =
      (object.diffractionPeakStatusListReq !== undefined && object.diffractionPeakStatusListReq !== null)
        ? DiffractionPeakStatusListReq.fromPartial(object.diffractionPeakStatusListReq)
        : undefined;
    message.diffractionPeakStatusListResp =
      (object.diffractionPeakStatusListResp !== undefined && object.diffractionPeakStatusListResp !== null)
        ? DiffractionPeakStatusListResp.fromPartial(object.diffractionPeakStatusListResp)
        : undefined;
    message.diffractionPeakStatusWriteReq =
      (object.diffractionPeakStatusWriteReq !== undefined && object.diffractionPeakStatusWriteReq !== null)
        ? DiffractionPeakStatusWriteReq.fromPartial(object.diffractionPeakStatusWriteReq)
        : undefined;
    message.diffractionPeakStatusWriteResp =
      (object.diffractionPeakStatusWriteResp !== undefined && object.diffractionPeakStatusWriteResp !== null)
        ? DiffractionPeakStatusWriteResp.fromPartial(object.diffractionPeakStatusWriteResp)
        : undefined;
    message.elementSetDeleteReq = (object.elementSetDeleteReq !== undefined && object.elementSetDeleteReq !== null)
      ? ElementSetDeleteReq.fromPartial(object.elementSetDeleteReq)
      : undefined;
    message.elementSetDeleteResp = (object.elementSetDeleteResp !== undefined && object.elementSetDeleteResp !== null)
      ? ElementSetDeleteResp.fromPartial(object.elementSetDeleteResp)
      : undefined;
    message.elementSetGetReq = (object.elementSetGetReq !== undefined && object.elementSetGetReq !== null)
      ? ElementSetGetReq.fromPartial(object.elementSetGetReq)
      : undefined;
    message.elementSetGetResp = (object.elementSetGetResp !== undefined && object.elementSetGetResp !== null)
      ? ElementSetGetResp.fromPartial(object.elementSetGetResp)
      : undefined;
    message.elementSetListReq = (object.elementSetListReq !== undefined && object.elementSetListReq !== null)
      ? ElementSetListReq.fromPartial(object.elementSetListReq)
      : undefined;
    message.elementSetListResp = (object.elementSetListResp !== undefined && object.elementSetListResp !== null)
      ? ElementSetListResp.fromPartial(object.elementSetListResp)
      : undefined;
    message.elementSetWriteReq = (object.elementSetWriteReq !== undefined && object.elementSetWriteReq !== null)
      ? ElementSetWriteReq.fromPartial(object.elementSetWriteReq)
      : undefined;
    message.elementSetWriteResp = (object.elementSetWriteResp !== undefined && object.elementSetWriteResp !== null)
      ? ElementSetWriteResp.fromPartial(object.elementSetWriteResp)
      : undefined;
    message.exportFilesReq = (object.exportFilesReq !== undefined && object.exportFilesReq !== null)
      ? ExportFilesReq.fromPartial(object.exportFilesReq)
      : undefined;
    message.exportFilesResp = (object.exportFilesResp !== undefined && object.exportFilesResp !== null)
      ? ExportFilesResp.fromPartial(object.exportFilesResp)
      : undefined;
    message.expressionDeleteReq = (object.expressionDeleteReq !== undefined && object.expressionDeleteReq !== null)
      ? ExpressionDeleteReq.fromPartial(object.expressionDeleteReq)
      : undefined;
    message.expressionDeleteResp = (object.expressionDeleteResp !== undefined && object.expressionDeleteResp !== null)
      ? ExpressionDeleteResp.fromPartial(object.expressionDeleteResp)
      : undefined;
    message.expressionGroupDeleteReq =
      (object.expressionGroupDeleteReq !== undefined && object.expressionGroupDeleteReq !== null)
        ? ExpressionGroupDeleteReq.fromPartial(object.expressionGroupDeleteReq)
        : undefined;
    message.expressionGroupDeleteResp =
      (object.expressionGroupDeleteResp !== undefined && object.expressionGroupDeleteResp !== null)
        ? ExpressionGroupDeleteResp.fromPartial(object.expressionGroupDeleteResp)
        : undefined;
    message.expressionGroupListReq =
      (object.expressionGroupListReq !== undefined && object.expressionGroupListReq !== null)
        ? ExpressionGroupListReq.fromPartial(object.expressionGroupListReq)
        : undefined;
    message.expressionGroupListResp =
      (object.expressionGroupListResp !== undefined && object.expressionGroupListResp !== null)
        ? ExpressionGroupListResp.fromPartial(object.expressionGroupListResp)
        : undefined;
    message.expressionGroupSetReq =
      (object.expressionGroupSetReq !== undefined && object.expressionGroupSetReq !== null)
        ? ExpressionGroupSetReq.fromPartial(object.expressionGroupSetReq)
        : undefined;
    message.expressionGroupSetResp =
      (object.expressionGroupSetResp !== undefined && object.expressionGroupSetResp !== null)
        ? ExpressionGroupSetResp.fromPartial(object.expressionGroupSetResp)
        : undefined;
    message.expressionListReq = (object.expressionListReq !== undefined && object.expressionListReq !== null)
      ? ExpressionListReq.fromPartial(object.expressionListReq)
      : undefined;
    message.expressionListResp = (object.expressionListResp !== undefined && object.expressionListResp !== null)
      ? ExpressionListResp.fromPartial(object.expressionListResp)
      : undefined;
    message.expressionReq = (object.expressionReq !== undefined && object.expressionReq !== null)
      ? ExpressionReq.fromPartial(object.expressionReq)
      : undefined;
    message.expressionResp = (object.expressionResp !== undefined && object.expressionResp !== null)
      ? ExpressionResp.fromPartial(object.expressionResp)
      : undefined;
    message.expressionWriteExecStatReq =
      (object.expressionWriteExecStatReq !== undefined && object.expressionWriteExecStatReq !== null)
        ? ExpressionWriteExecStatReq.fromPartial(object.expressionWriteExecStatReq)
        : undefined;
    message.expressionWriteExecStatResp =
      (object.expressionWriteExecStatResp !== undefined && object.expressionWriteExecStatResp !== null)
        ? ExpressionWriteExecStatResp.fromPartial(object.expressionWriteExecStatResp)
        : undefined;
    message.expressionWriteReq = (object.expressionWriteReq !== undefined && object.expressionWriteReq !== null)
      ? ExpressionWriteReq.fromPartial(object.expressionWriteReq)
      : undefined;
    message.expressionWriteResp = (object.expressionWriteResp !== undefined && object.expressionWriteResp !== null)
      ? ExpressionWriteResp.fromPartial(object.expressionWriteResp)
      : undefined;
    message.expressionWriteResultReq =
      (object.expressionWriteResultReq !== undefined && object.expressionWriteResultReq !== null)
        ? ExpressionWriteResultReq.fromPartial(object.expressionWriteResultReq)
        : undefined;
    message.expressionWriteResultResp =
      (object.expressionWriteResultResp !== undefined && object.expressionWriteResultResp !== null)
        ? ExpressionWriteResultResp.fromPartial(object.expressionWriteResultResp)
        : undefined;
    message.imageDeleteReq = (object.imageDeleteReq !== undefined && object.imageDeleteReq !== null)
      ? ImageDeleteReq.fromPartial(object.imageDeleteReq)
      : undefined;
    message.imageDeleteResp = (object.imageDeleteResp !== undefined && object.imageDeleteResp !== null)
      ? ImageDeleteResp.fromPartial(object.imageDeleteResp)
      : undefined;
    message.imageListReq = (object.imageListReq !== undefined && object.imageListReq !== null)
      ? ImageListReq.fromPartial(object.imageListReq)
      : undefined;
    message.imageListResp = (object.imageListResp !== undefined && object.imageListResp !== null)
      ? ImageListResp.fromPartial(object.imageListResp)
      : undefined;
    message.imageListUpd = (object.imageListUpd !== undefined && object.imageListUpd !== null)
      ? ImageListUpd.fromPartial(object.imageListUpd)
      : undefined;
    message.imageSetDefaultReq = (object.imageSetDefaultReq !== undefined && object.imageSetDefaultReq !== null)
      ? ImageSetDefaultReq.fromPartial(object.imageSetDefaultReq)
      : undefined;
    message.imageSetDefaultResp = (object.imageSetDefaultResp !== undefined && object.imageSetDefaultResp !== null)
      ? ImageSetDefaultResp.fromPartial(object.imageSetDefaultResp)
      : undefined;
    message.imageUploadReq = (object.imageUploadReq !== undefined && object.imageUploadReq !== null)
      ? ImageUploadReq.fromPartial(object.imageUploadReq)
      : undefined;
    message.imageUploadResp = (object.imageUploadResp !== undefined && object.imageUploadResp !== null)
      ? ImageUploadResp.fromPartial(object.imageUploadResp)
      : undefined;
    message.logGetLevelReq = (object.logGetLevelReq !== undefined && object.logGetLevelReq !== null)
      ? LogGetLevelReq.fromPartial(object.logGetLevelReq)
      : undefined;
    message.logGetLevelResp = (object.logGetLevelResp !== undefined && object.logGetLevelResp !== null)
      ? LogGetLevelResp.fromPartial(object.logGetLevelResp)
      : undefined;
    message.logReadReq = (object.logReadReq !== undefined && object.logReadReq !== null)
      ? LogReadReq.fromPartial(object.logReadReq)
      : undefined;
    message.logReadResp = (object.logReadResp !== undefined && object.logReadResp !== null)
      ? LogReadResp.fromPartial(object.logReadResp)
      : undefined;
    message.logSetLevelReq = (object.logSetLevelReq !== undefined && object.logSetLevelReq !== null)
      ? LogSetLevelReq.fromPartial(object.logSetLevelReq)
      : undefined;
    message.logSetLevelResp = (object.logSetLevelResp !== undefined && object.logSetLevelResp !== null)
      ? LogSetLevelResp.fromPartial(object.logSetLevelResp)
      : undefined;
    message.piquantConfigListReq = (object.piquantConfigListReq !== undefined && object.piquantConfigListReq !== null)
      ? PiquantConfigListReq.fromPartial(object.piquantConfigListReq)
      : undefined;
    message.piquantConfigListResp =
      (object.piquantConfigListResp !== undefined && object.piquantConfigListResp !== null)
        ? PiquantConfigListResp.fromPartial(object.piquantConfigListResp)
        : undefined;
    message.piquantConfigVersionReq =
      (object.piquantConfigVersionReq !== undefined && object.piquantConfigVersionReq !== null)
        ? PiquantConfigVersionReq.fromPartial(object.piquantConfigVersionReq)
        : undefined;
    message.piquantConfigVersionResp =
      (object.piquantConfigVersionResp !== undefined && object.piquantConfigVersionResp !== null)
        ? PiquantConfigVersionResp.fromPartial(object.piquantConfigVersionResp)
        : undefined;
    message.piquantConfigVersionsListReq =
      (object.piquantConfigVersionsListReq !== undefined && object.piquantConfigVersionsListReq !== null)
        ? PiquantConfigVersionsListReq.fromPartial(object.piquantConfigVersionsListReq)
        : undefined;
    message.piquantConfigVersionsListResp =
      (object.piquantConfigVersionsListResp !== undefined && object.piquantConfigVersionsListResp !== null)
        ? PiquantConfigVersionsListResp.fromPartial(object.piquantConfigVersionsListResp)
        : undefined;
    message.piquantSetVersionReq = (object.piquantSetVersionReq !== undefined && object.piquantSetVersionReq !== null)
      ? PiquantSetVersionReq.fromPartial(object.piquantSetVersionReq)
      : undefined;
    message.piquantSetVersionResp =
      (object.piquantSetVersionResp !== undefined && object.piquantSetVersionResp !== null)
        ? PiquantSetVersionResp.fromPartial(object.piquantSetVersionResp)
        : undefined;
    message.piquantVersionListReq =
      (object.piquantVersionListReq !== undefined && object.piquantVersionListReq !== null)
        ? PiquantVersionListReq.fromPartial(object.piquantVersionListReq)
        : undefined;
    message.piquantVersionListResp =
      (object.piquantVersionListResp !== undefined && object.piquantVersionListResp !== null)
        ? PiquantVersionListResp.fromPartial(object.piquantVersionListResp)
        : undefined;
    message.pseudoIntensityReq = (object.pseudoIntensityReq !== undefined && object.pseudoIntensityReq !== null)
      ? PseudoIntensityReq.fromPartial(object.pseudoIntensityReq)
      : undefined;
    message.pseudoIntensityResp = (object.pseudoIntensityResp !== undefined && object.pseudoIntensityResp !== null)
      ? PseudoIntensityResp.fromPartial(object.pseudoIntensityResp)
      : undefined;
    message.regionOfInterestDeleteReq =
      (object.regionOfInterestDeleteReq !== undefined && object.regionOfInterestDeleteReq !== null)
        ? RegionOfInterestDeleteReq.fromPartial(object.regionOfInterestDeleteReq)
        : undefined;
    message.regionOfInterestDeleteResp =
      (object.regionOfInterestDeleteResp !== undefined && object.regionOfInterestDeleteResp !== null)
        ? RegionOfInterestDeleteResp.fromPartial(object.regionOfInterestDeleteResp)
        : undefined;
    message.regionOfInterestListReq =
      (object.regionOfInterestListReq !== undefined && object.regionOfInterestListReq !== null)
        ? RegionOfInterestListReq.fromPartial(object.regionOfInterestListReq)
        : undefined;
    message.regionOfInterestListResp =
      (object.regionOfInterestListResp !== undefined && object.regionOfInterestListResp !== null)
        ? RegionOfInterestListResp.fromPartial(object.regionOfInterestListResp)
        : undefined;
    message.regionOfInterestReq = (object.regionOfInterestReq !== undefined && object.regionOfInterestReq !== null)
      ? RegionOfInterestReq.fromPartial(object.regionOfInterestReq)
      : undefined;
    message.regionOfInterestResp = (object.regionOfInterestResp !== undefined && object.regionOfInterestResp !== null)
      ? RegionOfInterestResp.fromPartial(object.regionOfInterestResp)
      : undefined;
    message.regionOfInterestWriteReq =
      (object.regionOfInterestWriteReq !== undefined && object.regionOfInterestWriteReq !== null)
        ? RegionOfInterestWriteReq.fromPartial(object.regionOfInterestWriteReq)
        : undefined;
    message.regionOfInterestWriteResp =
      (object.regionOfInterestWriteResp !== undefined && object.regionOfInterestWriteResp !== null)
        ? RegionOfInterestWriteResp.fromPartial(object.regionOfInterestWriteResp)
        : undefined;
    message.runTestReq = (object.runTestReq !== undefined && object.runTestReq !== null)
      ? RunTestReq.fromPartial(object.runTestReq)
      : undefined;
    message.runTestResp = (object.runTestResp !== undefined && object.runTestResp !== null)
      ? RunTestResp.fromPartial(object.runTestResp)
      : undefined;
    message.scanImageLocationsReq =
      (object.scanImageLocationsReq !== undefined && object.scanImageLocationsReq !== null)
        ? ScanImageLocationsReq.fromPartial(object.scanImageLocationsReq)
        : undefined;
    message.scanImageLocationsResp =
      (object.scanImageLocationsResp !== undefined && object.scanImageLocationsResp !== null)
        ? ScanImageLocationsResp.fromPartial(object.scanImageLocationsResp)
        : undefined;
    message.scanListReq = (object.scanListReq !== undefined && object.scanListReq !== null)
      ? ScanListReq.fromPartial(object.scanListReq)
      : undefined;
    message.scanListResp = (object.scanListResp !== undefined && object.scanListResp !== null)
      ? ScanListResp.fromPartial(object.scanListResp)
      : undefined;
    message.scanListUpd = (object.scanListUpd !== undefined && object.scanListUpd !== null)
      ? ScanListUpd.fromPartial(object.scanListUpd)
      : undefined;
    message.scanLocationReq = (object.scanLocationReq !== undefined && object.scanLocationReq !== null)
      ? ScanLocationReq.fromPartial(object.scanLocationReq)
      : undefined;
    message.scanLocationResp = (object.scanLocationResp !== undefined && object.scanLocationResp !== null)
      ? ScanLocationResp.fromPartial(object.scanLocationResp)
      : undefined;
    message.scanMetaLabelsReq = (object.scanMetaLabelsReq !== undefined && object.scanMetaLabelsReq !== null)
      ? ScanMetaLabelsReq.fromPartial(object.scanMetaLabelsReq)
      : undefined;
    message.scanMetaLabelsResp = (object.scanMetaLabelsResp !== undefined && object.scanMetaLabelsResp !== null)
      ? ScanMetaLabelsResp.fromPartial(object.scanMetaLabelsResp)
      : undefined;
    message.scanMetaWriteReq = (object.scanMetaWriteReq !== undefined && object.scanMetaWriteReq !== null)
      ? ScanMetaWriteReq.fromPartial(object.scanMetaWriteReq)
      : undefined;
    message.scanMetaWriteResp = (object.scanMetaWriteResp !== undefined && object.scanMetaWriteResp !== null)
      ? ScanMetaWriteResp.fromPartial(object.scanMetaWriteResp)
      : undefined;
    message.scanTriggerReImportReq =
      (object.scanTriggerReImportReq !== undefined && object.scanTriggerReImportReq !== null)
        ? ScanTriggerReImportReq.fromPartial(object.scanTriggerReImportReq)
        : undefined;
    message.scanTriggerReImportResp =
      (object.scanTriggerReImportResp !== undefined && object.scanTriggerReImportResp !== null)
        ? ScanTriggerReImportResp.fromPartial(object.scanTriggerReImportResp)
        : undefined;
    message.scanUploadReq = (object.scanUploadReq !== undefined && object.scanUploadReq !== null)
      ? ScanUploadReq.fromPartial(object.scanUploadReq)
      : undefined;
    message.scanUploadResp = (object.scanUploadResp !== undefined && object.scanUploadResp !== null)
      ? ScanUploadResp.fromPartial(object.scanUploadResp)
      : undefined;
    message.sendUserNotificationReq =
      (object.sendUserNotificationReq !== undefined && object.sendUserNotificationReq !== null)
        ? SendUserNotificationReq.fromPartial(object.sendUserNotificationReq)
        : undefined;
    message.sendUserNotificationResp =
      (object.sendUserNotificationResp !== undefined && object.sendUserNotificationResp !== null)
        ? SendUserNotificationResp.fromPartial(object.sendUserNotificationResp)
        : undefined;
    message.spectrumReq = (object.spectrumReq !== undefined && object.spectrumReq !== null)
      ? SpectrumReq.fromPartial(object.spectrumReq)
      : undefined;
    message.spectrumResp = (object.spectrumResp !== undefined && object.spectrumResp !== null)
      ? SpectrumResp.fromPartial(object.spectrumResp)
      : undefined;
    message.tagCreateReq = (object.tagCreateReq !== undefined && object.tagCreateReq !== null)
      ? TagCreateReq.fromPartial(object.tagCreateReq)
      : undefined;
    message.tagCreateResp = (object.tagCreateResp !== undefined && object.tagCreateResp !== null)
      ? TagCreateResp.fromPartial(object.tagCreateResp)
      : undefined;
    message.tagDeleteReq = (object.tagDeleteReq !== undefined && object.tagDeleteReq !== null)
      ? TagDeleteReq.fromPartial(object.tagDeleteReq)
      : undefined;
    message.tagDeleteResp = (object.tagDeleteResp !== undefined && object.tagDeleteResp !== null)
      ? TagDeleteResp.fromPartial(object.tagDeleteResp)
      : undefined;
    message.tagListReq = (object.tagListReq !== undefined && object.tagListReq !== null)
      ? TagListReq.fromPartial(object.tagListReq)
      : undefined;
    message.tagListResp = (object.tagListResp !== undefined && object.tagListResp !== null)
      ? TagListResp.fromPartial(object.tagListResp)
      : undefined;
    message.userAddRoleReq = (object.userAddRoleReq !== undefined && object.userAddRoleReq !== null)
      ? UserAddRoleReq.fromPartial(object.userAddRoleReq)
      : undefined;
    message.userAddRoleResp = (object.userAddRoleResp !== undefined && object.userAddRoleResp !== null)
      ? UserAddRoleResp.fromPartial(object.userAddRoleResp)
      : undefined;
    message.userDeleteRoleReq = (object.userDeleteRoleReq !== undefined && object.userDeleteRoleReq !== null)
      ? UserDeleteRoleReq.fromPartial(object.userDeleteRoleReq)
      : undefined;
    message.userDeleteRoleResp = (object.userDeleteRoleResp !== undefined && object.userDeleteRoleResp !== null)
      ? UserDeleteRoleResp.fromPartial(object.userDeleteRoleResp)
      : undefined;
    message.userDetailsReq = (object.userDetailsReq !== undefined && object.userDetailsReq !== null)
      ? UserDetailsReq.fromPartial(object.userDetailsReq)
      : undefined;
    message.userDetailsResp = (object.userDetailsResp !== undefined && object.userDetailsResp !== null)
      ? UserDetailsResp.fromPartial(object.userDetailsResp)
      : undefined;
    message.userDetailsUpd = (object.userDetailsUpd !== undefined && object.userDetailsUpd !== null)
      ? UserDetailsUpd.fromPartial(object.userDetailsUpd)
      : undefined;
    message.userDetailsWriteReq = (object.userDetailsWriteReq !== undefined && object.userDetailsWriteReq !== null)
      ? UserDetailsWriteReq.fromPartial(object.userDetailsWriteReq)
      : undefined;
    message.userDetailsWriteResp = (object.userDetailsWriteResp !== undefined && object.userDetailsWriteResp !== null)
      ? UserDetailsWriteResp.fromPartial(object.userDetailsWriteResp)
      : undefined;
    message.userDismissHintReq = (object.userDismissHintReq !== undefined && object.userDismissHintReq !== null)
      ? UserDismissHintReq.fromPartial(object.userDismissHintReq)
      : undefined;
    message.userDismissHintResp = (object.userDismissHintResp !== undefined && object.userDismissHintResp !== null)
      ? UserDismissHintResp.fromPartial(object.userDismissHintResp)
      : undefined;
    message.userHintsReq = (object.userHintsReq !== undefined && object.userHintsReq !== null)
      ? UserHintsReq.fromPartial(object.userHintsReq)
      : undefined;
    message.userHintsResp = (object.userHintsResp !== undefined && object.userHintsResp !== null)
      ? UserHintsResp.fromPartial(object.userHintsResp)
      : undefined;
    message.userHintsToggleReq = (object.userHintsToggleReq !== undefined && object.userHintsToggleReq !== null)
      ? UserHintsToggleReq.fromPartial(object.userHintsToggleReq)
      : undefined;
    message.userHintsToggleResp = (object.userHintsToggleResp !== undefined && object.userHintsToggleResp !== null)
      ? UserHintsToggleResp.fromPartial(object.userHintsToggleResp)
      : undefined;
    message.userHintsUpd = (object.userHintsUpd !== undefined && object.userHintsUpd !== null)
      ? UserHintsUpd.fromPartial(object.userHintsUpd)
      : undefined;
    message.userListReq = (object.userListReq !== undefined && object.userListReq !== null)
      ? UserListReq.fromPartial(object.userListReq)
      : undefined;
    message.userListResp = (object.userListResp !== undefined && object.userListResp !== null)
      ? UserListResp.fromPartial(object.userListResp)
      : undefined;
    message.userNotificationReq = (object.userNotificationReq !== undefined && object.userNotificationReq !== null)
      ? UserNotificationReq.fromPartial(object.userNotificationReq)
      : undefined;
    message.userNotificationResp = (object.userNotificationResp !== undefined && object.userNotificationResp !== null)
      ? UserNotificationResp.fromPartial(object.userNotificationResp)
      : undefined;
    message.userNotificationSettingsReq =
      (object.userNotificationSettingsReq !== undefined && object.userNotificationSettingsReq !== null)
        ? UserNotificationSettingsReq.fromPartial(object.userNotificationSettingsReq)
        : undefined;
    message.userNotificationSettingsResp =
      (object.userNotificationSettingsResp !== undefined && object.userNotificationSettingsResp !== null)
        ? UserNotificationSettingsResp.fromPartial(object.userNotificationSettingsResp)
        : undefined;
    message.userNotificationSettingsUpd =
      (object.userNotificationSettingsUpd !== undefined && object.userNotificationSettingsUpd !== null)
        ? UserNotificationSettingsUpd.fromPartial(object.userNotificationSettingsUpd)
        : undefined;
    message.userNotificationSettingsWriteReq =
      (object.userNotificationSettingsWriteReq !== undefined && object.userNotificationSettingsWriteReq !== null)
        ? UserNotificationSettingsWriteReq.fromPartial(object.userNotificationSettingsWriteReq)
        : undefined;
    message.userNotificationSettingsWriteResp =
      (object.userNotificationSettingsWriteResp !== undefined && object.userNotificationSettingsWriteResp !== null)
        ? UserNotificationSettingsWriteResp.fromPartial(object.userNotificationSettingsWriteResp)
        : undefined;
    message.userNotificationUpd = (object.userNotificationUpd !== undefined && object.userNotificationUpd !== null)
      ? UserNotificationUpd.fromPartial(object.userNotificationUpd)
      : undefined;
    message.userRoleListReq = (object.userRoleListReq !== undefined && object.userRoleListReq !== null)
      ? UserRoleListReq.fromPartial(object.userRoleListReq)
      : undefined;
    message.userRoleListResp = (object.userRoleListResp !== undefined && object.userRoleListResp !== null)
      ? UserRoleListResp.fromPartial(object.userRoleListResp)
      : undefined;
    message.userRolesListReq = (object.userRolesListReq !== undefined && object.userRolesListReq !== null)
      ? UserRolesListReq.fromPartial(object.userRolesListReq)
      : undefined;
    message.userRolesListResp = (object.userRolesListResp !== undefined && object.userRolesListResp !== null)
      ? UserRolesListResp.fromPartial(object.userRolesListResp)
      : undefined;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
