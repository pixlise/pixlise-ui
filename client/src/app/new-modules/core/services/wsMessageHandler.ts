// GENERATED CODE! Do not hand-modify

import { Subject } from 'rxjs';
import {
    DetectorConfigReq,
    DetectorConfigResp } from "src/app/generated-protos/detector-config-msgs"
import {
    DiffractionPeakManualWriteReq,
    DiffractionPeakManualWriteResp,
    DiffractionPeakManualDeleteReq,
    DiffractionPeakManualDeleteResp,
    DiffractionPeakManualListReq,
    DiffractionPeakManualListResp } from "src/app/generated-protos/diffraction-manual-msgs"
import {
    DiffractionPeakStatusListReq,
    DiffractionPeakStatusListResp,
    DiffractionPeakStatusDeleteReq,
    DiffractionPeakStatusDeleteResp,
    DiffractionPeakStatusWriteReq,
    DiffractionPeakStatusWriteResp } from "src/app/generated-protos/diffraction-status-msgs"
import {
    ElementSetGetReq,
    ElementSetGetResp,
    ElementSetDeleteReq,
    ElementSetDeleteResp,
    ElementSetWriteReq,
    ElementSetWriteResp,
    ElementSetListReq,
    ElementSetListResp } from "src/app/generated-protos/element-set-msgs"
import {
    ExportFilesReq,
    ExportFilesResp } from "src/app/generated-protos/export-msgs"
import {
    ExpressionGroupListReq,
    ExpressionGroupListResp,
    ExpressionGroupSetReq,
    ExpressionGroupSetResp,
    ExpressionGroupDeleteReq,
    ExpressionGroupDeleteResp } from "src/app/generated-protos/expression-group-msgs"
import {
    ExpressionWriteReq,
    ExpressionWriteResp,
    ExpressionDeleteReq,
    ExpressionDeleteResp,
    ExpressionListReq,
    ExpressionListResp,
    ExpressionWriteExecStatReq,
    ExpressionWriteExecStatResp,
    ExpressionWriteResultReq,
    ExpressionWriteResultResp,
    ExpressionReq,
    ExpressionResp } from "src/app/generated-protos/expression-msgs"
import {
    ImageListReq,
    ImageListResp,
    ImageListUpd,
    ImageDeleteReq,
    ImageDeleteResp,
    ImageSetDefaultReq,
    ImageSetDefaultResp,
    ImageUploadReq,
    ImageUploadResp } from "src/app/generated-protos/image-msgs"
import {
    LogReadReq,
    LogReadResp,
    LogSetLevelReq,
    LogSetLevelResp,
    LogGetLevelReq,
    LogGetLevelResp } from "src/app/generated-protos/log-msgs"
import {
    DataModuleListReq,
    DataModuleListResp,
    DataModuleReq,
    DataModuleResp,
    DataModuleWriteReq,
    DataModuleWriteResp } from "src/app/generated-protos/module-msgs"
import {
    PiquantConfigListReq,
    PiquantConfigListResp,
    PiquantSetVersionReq,
    PiquantSetVersionResp,
    PiquantConfigVersionReq,
    PiquantConfigVersionResp,
    PiquantVersionListReq,
    PiquantVersionListResp,
    PiquantConfigVersionsListReq,
    PiquantConfigVersionsListResp } from "src/app/generated-protos/piquant-msgs"
import {
    PseudoIntensityReq,
    PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs"
import {
    RegionOfInterestListReq,
    RegionOfInterestListResp,
    RegionOfInterestDeleteReq,
    RegionOfInterestDeleteResp,
    RegionOfInterestReq,
    RegionOfInterestResp,
    RegionOfInterestWriteReq,
    RegionOfInterestWriteResp } from "src/app/generated-protos/roi-msgs"
import {
    ScanImageLocationsReq,
    ScanImageLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs"
import {
    ScanLocationReq,
    ScanLocationResp } from "src/app/generated-protos/scan-location-msgs"
import {
    ScanMetaWriteReq,
    ScanMetaWriteResp,
    ScanListReq,
    ScanListResp,
    ScanListUpd,
    ScanUploadReq,
    ScanUploadResp,
    ScanMetaLabelsReq,
    ScanMetaLabelsResp,
    ScanTriggerReImportReq,
    ScanTriggerReImportResp } from "src/app/generated-protos/scan-msgs"
import {
    SpectrumReq,
    SpectrumResp } from "src/app/generated-protos/spectrum-msgs"
import {
    TagDeleteReq,
    TagDeleteResp,
    TagCreateReq,
    TagCreateResp,
    TagListReq,
    TagListResp } from "src/app/generated-protos/tag-msgs"
import {
    RunTestReq,
    RunTestResp } from "src/app/generated-protos/test-msgs"
import {
    UserHintsToggleReq,
    UserHintsToggleResp,
    UserHintsReq,
    UserHintsResp,
    UserHintsUpd,
    UserDismissHintReq,
    UserDismissHintResp } from "src/app/generated-protos/user-hints-msgs"
import {
    UserRolesListReq,
    UserRolesListResp,
    UserAddRoleReq,
    UserAddRoleResp,
    UserDeleteRoleReq,
    UserDeleteRoleResp,
    UserListReq,
    UserListResp,
    UserRoleListReq,
    UserRoleListResp } from "src/app/generated-protos/user-management-msgs"
import {
    UserDetailsWriteReq,
    UserDetailsWriteResp,
    UserDetailsReq,
    UserDetailsResp,
    UserDetailsUpd } from "src/app/generated-protos/user-msgs"
import {
    SendUserNotificationReq,
    SendUserNotificationResp,
    UserNotificationReq,
    UserNotificationResp,
    UserNotificationUpd } from "src/app/generated-protos/user-notification-msgs"
import {
    UserNotificationSettingsReq,
    UserNotificationSettingsResp,
    UserNotificationSettingsUpd,
    UserNotificationSettingsWriteReq,
    UserNotificationSettingsWriteResp } from "src/app/generated-protos/user-notification-setting-msgs"
import { WSMessage } from "src/app/generated-protos/websocket"

// Type-specific request send functions which return the right type of response
export abstract class WSMessageHandler
{
    private _lastMsgId = 1;

	protected abstract sendRequest(msg: WSMessage): void;

    public imageListUpd$ = new Subject<ImageListUpd>();
    public userNotificationSettingsUpd$ = new Subject<UserNotificationSettingsUpd>();
    public scanListUpd$ = new Subject<ScanListUpd>();
    public userNotificationUpd$ = new Subject<UserNotificationUpd>();
    public userHintsUpd$ = new Subject<UserHintsUpd>();
    public userDetailsUpd$ = new Subject<UserDetailsUpd>();

    protected _DiffractionPeakManualListSubjects = new Map<number, Subject<DiffractionPeakManualListResp>>();
    sendDiffractionPeakManualListRequest(req: DiffractionPeakManualListReq): Subject<DiffractionPeakManualListResp> {
        let wsreq = WSMessage.create({diffractionPeakManualListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DiffractionPeakManualListResp>();
        this._DiffractionPeakManualListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionSubjects = new Map<number, Subject<ExpressionResp>>();
    sendExpressionRequest(req: ExpressionReq): Subject<ExpressionResp> {
        let wsreq = WSMessage.create({expressionReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionResp>();
        this._ExpressionSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ImageUploadSubjects = new Map<number, Subject<ImageUploadResp>>();
    sendImageUploadRequest(req: ImageUploadReq): Subject<ImageUploadResp> {
        let wsreq = WSMessage.create({imageUploadReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ImageUploadResp>();
        this._ImageUploadSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _PiquantConfigVersionsListSubjects = new Map<number, Subject<PiquantConfigVersionsListResp>>();
    sendPiquantConfigVersionsListRequest(req: PiquantConfigVersionsListReq): Subject<PiquantConfigVersionsListResp> {
        let wsreq = WSMessage.create({piquantConfigVersionsListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<PiquantConfigVersionsListResp>();
        this._PiquantConfigVersionsListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _RegionOfInterestWriteSubjects = new Map<number, Subject<RegionOfInterestWriteResp>>();
    sendRegionOfInterestWriteRequest(req: RegionOfInterestWriteReq): Subject<RegionOfInterestWriteResp> {
        let wsreq = WSMessage.create({regionOfInterestWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<RegionOfInterestWriteResp>();
        this._RegionOfInterestWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ScanImageLocationsSubjects = new Map<number, Subject<ScanImageLocationsResp>>();
    sendScanImageLocationsRequest(req: ScanImageLocationsReq): Subject<ScanImageLocationsResp> {
        let wsreq = WSMessage.create({scanImageLocationsReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ScanImageLocationsResp>();
        this._ScanImageLocationsSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ImageListSubjects = new Map<number, Subject<ImageListResp>>();
    sendImageListRequest(req: ImageListReq): Subject<ImageListResp> {
        let wsreq = WSMessage.create({imageListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ImageListResp>();
        this._ImageListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DataModuleListSubjects = new Map<number, Subject<DataModuleListResp>>();
    sendDataModuleListRequest(req: DataModuleListReq): Subject<DataModuleListResp> {
        let wsreq = WSMessage.create({dataModuleListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DataModuleListResp>();
        this._DataModuleListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _PseudoIntensitySubjects = new Map<number, Subject<PseudoIntensityResp>>();
    sendPseudoIntensityRequest(req: PseudoIntensityReq): Subject<PseudoIntensityResp> {
        let wsreq = WSMessage.create({pseudoIntensityReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<PseudoIntensityResp>();
        this._PseudoIntensitySubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _RegionOfInterestListSubjects = new Map<number, Subject<RegionOfInterestListResp>>();
    sendRegionOfInterestListRequest(req: RegionOfInterestListReq): Subject<RegionOfInterestListResp> {
        let wsreq = WSMessage.create({regionOfInterestListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<RegionOfInterestListResp>();
        this._RegionOfInterestListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ScanMetaWriteSubjects = new Map<number, Subject<ScanMetaWriteResp>>();
    sendScanMetaWriteRequest(req: ScanMetaWriteReq): Subject<ScanMetaWriteResp> {
        let wsreq = WSMessage.create({scanMetaWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ScanMetaWriteResp>();
        this._ScanMetaWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserHintsToggleSubjects = new Map<number, Subject<UserHintsToggleResp>>();
    sendUserHintsToggleRequest(req: UserHintsToggleReq): Subject<UserHintsToggleResp> {
        let wsreq = WSMessage.create({userHintsToggleReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserHintsToggleResp>();
        this._UserHintsToggleSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DetectorConfigSubjects = new Map<number, Subject<DetectorConfigResp>>();
    sendDetectorConfigRequest(req: DetectorConfigReq): Subject<DetectorConfigResp> {
        let wsreq = WSMessage.create({detectorConfigReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DetectorConfigResp>();
        this._DetectorConfigSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ElementSetGetSubjects = new Map<number, Subject<ElementSetGetResp>>();
    sendElementSetGetRequest(req: ElementSetGetReq): Subject<ElementSetGetResp> {
        let wsreq = WSMessage.create({elementSetGetReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ElementSetGetResp>();
        this._ElementSetGetSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionWriteSubjects = new Map<number, Subject<ExpressionWriteResp>>();
    sendExpressionWriteRequest(req: ExpressionWriteReq): Subject<ExpressionWriteResp> {
        let wsreq = WSMessage.create({expressionWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionWriteResp>();
        this._ExpressionWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserRolesListSubjects = new Map<number, Subject<UserRolesListResp>>();
    sendUserRolesListRequest(req: UserRolesListReq): Subject<UserRolesListResp> {
        let wsreq = WSMessage.create({userRolesListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserRolesListResp>();
        this._UserRolesListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _SendUserNotificationSubjects = new Map<number, Subject<SendUserNotificationResp>>();
    sendSendUserNotificationRequest(req: SendUserNotificationReq): Subject<SendUserNotificationResp> {
        let wsreq = WSMessage.create({sendUserNotificationReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<SendUserNotificationResp>();
        this._SendUserNotificationSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DiffractionPeakManualWriteSubjects = new Map<number, Subject<DiffractionPeakManualWriteResp>>();
    sendDiffractionPeakManualWriteRequest(req: DiffractionPeakManualWriteReq): Subject<DiffractionPeakManualWriteResp> {
        let wsreq = WSMessage.create({diffractionPeakManualWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DiffractionPeakManualWriteResp>();
        this._DiffractionPeakManualWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionGroupListSubjects = new Map<number, Subject<ExpressionGroupListResp>>();
    sendExpressionGroupListRequest(req: ExpressionGroupListReq): Subject<ExpressionGroupListResp> {
        let wsreq = WSMessage.create({expressionGroupListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionGroupListResp>();
        this._ExpressionGroupListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionDeleteSubjects = new Map<number, Subject<ExpressionDeleteResp>>();
    sendExpressionDeleteRequest(req: ExpressionDeleteReq): Subject<ExpressionDeleteResp> {
        let wsreq = WSMessage.create({expressionDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionDeleteResp>();
        this._ExpressionDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _TagDeleteSubjects = new Map<number, Subject<TagDeleteResp>>();
    sendTagDeleteRequest(req: TagDeleteReq): Subject<TagDeleteResp> {
        let wsreq = WSMessage.create({tagDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<TagDeleteResp>();
        this._TagDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionListSubjects = new Map<number, Subject<ExpressionListResp>>();
    sendExpressionListRequest(req: ExpressionListReq): Subject<ExpressionListResp> {
        let wsreq = WSMessage.create({expressionListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionListResp>();
        this._ExpressionListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ScanListSubjects = new Map<number, Subject<ScanListResp>>();
    sendScanListRequest(req: ScanListReq): Subject<ScanListResp> {
        let wsreq = WSMessage.create({scanListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ScanListResp>();
        this._ScanListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ScanUploadSubjects = new Map<number, Subject<ScanUploadResp>>();
    sendScanUploadRequest(req: ScanUploadReq): Subject<ScanUploadResp> {
        let wsreq = WSMessage.create({scanUploadReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ScanUploadResp>();
        this._ScanUploadSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ScanMetaLabelsSubjects = new Map<number, Subject<ScanMetaLabelsResp>>();
    sendScanMetaLabelsRequest(req: ScanMetaLabelsReq): Subject<ScanMetaLabelsResp> {
        let wsreq = WSMessage.create({scanMetaLabelsReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ScanMetaLabelsResp>();
        this._ScanMetaLabelsSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserNotificationSettingsSubjects = new Map<number, Subject<UserNotificationSettingsResp>>();
    sendUserNotificationSettingsRequest(req: UserNotificationSettingsReq): Subject<UserNotificationSettingsResp> {
        let wsreq = WSMessage.create({userNotificationSettingsReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserNotificationSettingsResp>();
        this._UserNotificationSettingsSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserDeleteRoleSubjects = new Map<number, Subject<UserDeleteRoleResp>>();
    sendUserDeleteRoleRequest(req: UserDeleteRoleReq): Subject<UserDeleteRoleResp> {
        let wsreq = WSMessage.create({userDeleteRoleReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserDeleteRoleResp>();
        this._UserDeleteRoleSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DiffractionPeakStatusListSubjects = new Map<number, Subject<DiffractionPeakStatusListResp>>();
    sendDiffractionPeakStatusListRequest(req: DiffractionPeakStatusListReq): Subject<DiffractionPeakStatusListResp> {
        let wsreq = WSMessage.create({diffractionPeakStatusListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DiffractionPeakStatusListResp>();
        this._DiffractionPeakStatusListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DiffractionPeakStatusDeleteSubjects = new Map<number, Subject<DiffractionPeakStatusDeleteResp>>();
    sendDiffractionPeakStatusDeleteRequest(req: DiffractionPeakStatusDeleteReq): Subject<DiffractionPeakStatusDeleteResp> {
        let wsreq = WSMessage.create({diffractionPeakStatusDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DiffractionPeakStatusDeleteResp>();
        this._DiffractionPeakStatusDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _PiquantConfigListSubjects = new Map<number, Subject<PiquantConfigListResp>>();
    sendPiquantConfigListRequest(req: PiquantConfigListReq): Subject<PiquantConfigListResp> {
        let wsreq = WSMessage.create({piquantConfigListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<PiquantConfigListResp>();
        this._PiquantConfigListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _RegionOfInterestDeleteSubjects = new Map<number, Subject<RegionOfInterestDeleteResp>>();
    sendRegionOfInterestDeleteRequest(req: RegionOfInterestDeleteReq): Subject<RegionOfInterestDeleteResp> {
        let wsreq = WSMessage.create({regionOfInterestDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<RegionOfInterestDeleteResp>();
        this._RegionOfInterestDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ScanTriggerReImportSubjects = new Map<number, Subject<ScanTriggerReImportResp>>();
    sendScanTriggerReImportRequest(req: ScanTriggerReImportReq): Subject<ScanTriggerReImportResp> {
        let wsreq = WSMessage.create({scanTriggerReImportReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ScanTriggerReImportResp>();
        this._ScanTriggerReImportSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _TagCreateSubjects = new Map<number, Subject<TagCreateResp>>();
    sendTagCreateRequest(req: TagCreateReq): Subject<TagCreateResp> {
        let wsreq = WSMessage.create({tagCreateReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<TagCreateResp>();
        this._TagCreateSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserAddRoleSubjects = new Map<number, Subject<UserAddRoleResp>>();
    sendUserAddRoleRequest(req: UserAddRoleReq): Subject<UserAddRoleResp> {
        let wsreq = WSMessage.create({userAddRoleReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserAddRoleResp>();
        this._UserAddRoleSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _SpectrumSubjects = new Map<number, Subject<SpectrumResp>>();
    sendSpectrumRequest(req: SpectrumReq): Subject<SpectrumResp> {
        let wsreq = WSMessage.create({spectrumReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<SpectrumResp>();
        this._SpectrumSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserListSubjects = new Map<number, Subject<UserListResp>>();
    sendUserListRequest(req: UserListReq): Subject<UserListResp> {
        let wsreq = WSMessage.create({userListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserListResp>();
        this._UserListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExportFilesSubjects = new Map<number, Subject<ExportFilesResp>>();
    sendExportFilesRequest(req: ExportFilesReq): Subject<ExportFilesResp> {
        let wsreq = WSMessage.create({exportFilesReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExportFilesResp>();
        this._ExportFilesSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ImageDeleteSubjects = new Map<number, Subject<ImageDeleteResp>>();
    sendImageDeleteRequest(req: ImageDeleteReq): Subject<ImageDeleteResp> {
        let wsreq = WSMessage.create({imageDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ImageDeleteResp>();
        this._ImageDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _LogReadSubjects = new Map<number, Subject<LogReadResp>>();
    sendLogReadRequest(req: LogReadReq): Subject<LogReadResp> {
        let wsreq = WSMessage.create({logReadReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<LogReadResp>();
        this._LogReadSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserNotificationSubjects = new Map<number, Subject<UserNotificationResp>>();
    sendUserNotificationRequest(req: UserNotificationReq): Subject<UserNotificationResp> {
        let wsreq = WSMessage.create({userNotificationReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserNotificationResp>();
        this._UserNotificationSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DiffractionPeakManualDeleteSubjects = new Map<number, Subject<DiffractionPeakManualDeleteResp>>();
    sendDiffractionPeakManualDeleteRequest(req: DiffractionPeakManualDeleteReq): Subject<DiffractionPeakManualDeleteResp> {
        let wsreq = WSMessage.create({diffractionPeakManualDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DiffractionPeakManualDeleteResp>();
        this._DiffractionPeakManualDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DiffractionPeakStatusWriteSubjects = new Map<number, Subject<DiffractionPeakStatusWriteResp>>();
    sendDiffractionPeakStatusWriteRequest(req: DiffractionPeakStatusWriteReq): Subject<DiffractionPeakStatusWriteResp> {
        let wsreq = WSMessage.create({diffractionPeakStatusWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DiffractionPeakStatusWriteResp>();
        this._DiffractionPeakStatusWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionGroupSetSubjects = new Map<number, Subject<ExpressionGroupSetResp>>();
    sendExpressionGroupSetRequest(req: ExpressionGroupSetReq): Subject<ExpressionGroupSetResp> {
        let wsreq = WSMessage.create({expressionGroupSetReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionGroupSetResp>();
        this._ExpressionGroupSetSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionGroupDeleteSubjects = new Map<number, Subject<ExpressionGroupDeleteResp>>();
    sendExpressionGroupDeleteRequest(req: ExpressionGroupDeleteReq): Subject<ExpressionGroupDeleteResp> {
        let wsreq = WSMessage.create({expressionGroupDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionGroupDeleteResp>();
        this._ExpressionGroupDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _LogSetLevelSubjects = new Map<number, Subject<LogSetLevelResp>>();
    sendLogSetLevelRequest(req: LogSetLevelReq): Subject<LogSetLevelResp> {
        let wsreq = WSMessage.create({logSetLevelReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<LogSetLevelResp>();
        this._LogSetLevelSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ScanLocationSubjects = new Map<number, Subject<ScanLocationResp>>();
    sendScanLocationRequest(req: ScanLocationReq): Subject<ScanLocationResp> {
        let wsreq = WSMessage.create({scanLocationReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ScanLocationResp>();
        this._ScanLocationSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ImageSetDefaultSubjects = new Map<number, Subject<ImageSetDefaultResp>>();
    sendImageSetDefaultRequest(req: ImageSetDefaultReq): Subject<ImageSetDefaultResp> {
        let wsreq = WSMessage.create({imageSetDefaultReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ImageSetDefaultResp>();
        this._ImageSetDefaultSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DataModuleSubjects = new Map<number, Subject<DataModuleResp>>();
    sendDataModuleRequest(req: DataModuleReq): Subject<DataModuleResp> {
        let wsreq = WSMessage.create({dataModuleReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DataModuleResp>();
        this._DataModuleSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _RunTestSubjects = new Map<number, Subject<RunTestResp>>();
    sendRunTestRequest(req: RunTestReq): Subject<RunTestResp> {
        let wsreq = WSMessage.create({runTestReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<RunTestResp>();
        this._RunTestSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserHintsSubjects = new Map<number, Subject<UserHintsResp>>();
    sendUserHintsRequest(req: UserHintsReq): Subject<UserHintsResp> {
        let wsreq = WSMessage.create({userHintsReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserHintsResp>();
        this._UserHintsSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserDismissHintSubjects = new Map<number, Subject<UserDismissHintResp>>();
    sendUserDismissHintRequest(req: UserDismissHintReq): Subject<UserDismissHintResp> {
        let wsreq = WSMessage.create({userDismissHintReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserDismissHintResp>();
        this._UserDismissHintSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserRoleListSubjects = new Map<number, Subject<UserRoleListResp>>();
    sendUserRoleListRequest(req: UserRoleListReq): Subject<UserRoleListResp> {
        let wsreq = WSMessage.create({userRoleListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserRoleListResp>();
        this._UserRoleListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ElementSetDeleteSubjects = new Map<number, Subject<ElementSetDeleteResp>>();
    sendElementSetDeleteRequest(req: ElementSetDeleteReq): Subject<ElementSetDeleteResp> {
        let wsreq = WSMessage.create({elementSetDeleteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ElementSetDeleteResp>();
        this._ElementSetDeleteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserDetailsWriteSubjects = new Map<number, Subject<UserDetailsWriteResp>>();
    sendUserDetailsWriteRequest(req: UserDetailsWriteReq): Subject<UserDetailsWriteResp> {
        let wsreq = WSMessage.create({userDetailsWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserDetailsWriteResp>();
        this._UserDetailsWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _LogGetLevelSubjects = new Map<number, Subject<LogGetLevelResp>>();
    sendLogGetLevelRequest(req: LogGetLevelReq): Subject<LogGetLevelResp> {
        let wsreq = WSMessage.create({logGetLevelReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<LogGetLevelResp>();
        this._LogGetLevelSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _DataModuleWriteSubjects = new Map<number, Subject<DataModuleWriteResp>>();
    sendDataModuleWriteRequest(req: DataModuleWriteReq): Subject<DataModuleWriteResp> {
        let wsreq = WSMessage.create({dataModuleWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<DataModuleWriteResp>();
        this._DataModuleWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _RegionOfInterestSubjects = new Map<number, Subject<RegionOfInterestResp>>();
    sendRegionOfInterestRequest(req: RegionOfInterestReq): Subject<RegionOfInterestResp> {
        let wsreq = WSMessage.create({regionOfInterestReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<RegionOfInterestResp>();
        this._RegionOfInterestSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _TagListSubjects = new Map<number, Subject<TagListResp>>();
    sendTagListRequest(req: TagListReq): Subject<TagListResp> {
        let wsreq = WSMessage.create({tagListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<TagListResp>();
        this._TagListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserDetailsSubjects = new Map<number, Subject<UserDetailsResp>>();
    sendUserDetailsRequest(req: UserDetailsReq): Subject<UserDetailsResp> {
        let wsreq = WSMessage.create({userDetailsReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserDetailsResp>();
        this._UserDetailsSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionWriteExecStatSubjects = new Map<number, Subject<ExpressionWriteExecStatResp>>();
    sendExpressionWriteExecStatRequest(req: ExpressionWriteExecStatReq): Subject<ExpressionWriteExecStatResp> {
        let wsreq = WSMessage.create({expressionWriteExecStatReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionWriteExecStatResp>();
        this._ExpressionWriteExecStatSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _PiquantSetVersionSubjects = new Map<number, Subject<PiquantSetVersionResp>>();
    sendPiquantSetVersionRequest(req: PiquantSetVersionReq): Subject<PiquantSetVersionResp> {
        let wsreq = WSMessage.create({piquantSetVersionReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<PiquantSetVersionResp>();
        this._PiquantSetVersionSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _UserNotificationSettingsWriteSubjects = new Map<number, Subject<UserNotificationSettingsWriteResp>>();
    sendUserNotificationSettingsWriteRequest(req: UserNotificationSettingsWriteReq): Subject<UserNotificationSettingsWriteResp> {
        let wsreq = WSMessage.create({userNotificationSettingsWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<UserNotificationSettingsWriteResp>();
        this._UserNotificationSettingsWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ElementSetWriteSubjects = new Map<number, Subject<ElementSetWriteResp>>();
    sendElementSetWriteRequest(req: ElementSetWriteReq): Subject<ElementSetWriteResp> {
        let wsreq = WSMessage.create({elementSetWriteReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ElementSetWriteResp>();
        this._ElementSetWriteSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _PiquantConfigVersionSubjects = new Map<number, Subject<PiquantConfigVersionResp>>();
    sendPiquantConfigVersionRequest(req: PiquantConfigVersionReq): Subject<PiquantConfigVersionResp> {
        let wsreq = WSMessage.create({piquantConfigVersionReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<PiquantConfigVersionResp>();
        this._PiquantConfigVersionSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ElementSetListSubjects = new Map<number, Subject<ElementSetListResp>>();
    sendElementSetListRequest(req: ElementSetListReq): Subject<ElementSetListResp> {
        let wsreq = WSMessage.create({elementSetListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ElementSetListResp>();
        this._ElementSetListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _ExpressionWriteResultSubjects = new Map<number, Subject<ExpressionWriteResultResp>>();
    sendExpressionWriteResultRequest(req: ExpressionWriteResultReq): Subject<ExpressionWriteResultResp> {
        let wsreq = WSMessage.create({expressionWriteResultReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<ExpressionWriteResultResp>();
        this._ExpressionWriteResultSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected _PiquantVersionListSubjects = new Map<number, Subject<PiquantVersionListResp>>();
    sendPiquantVersionListRequest(req: PiquantVersionListReq): Subject<PiquantVersionListResp> {
        let wsreq = WSMessage.create({piquantVersionListReq: req});
        wsreq.msgId = this._lastMsgId++;

		let subj = new Subject<PiquantVersionListResp>();
        this._PiquantVersionListSubjects.set(wsreq.msgId, subj);
        this.sendRequest(wsreq);

		return subj;
    }

    protected dispatchResponse(wsmsg: WSMessage): boolean {
        if(wsmsg.detectorConfigResp) {
            let subj = this._DetectorConfigSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.detectorConfigResp);
			    subj.complete();

			    this._DetectorConfigSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.elementSetGetResp) {
            let subj = this._ElementSetGetSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.elementSetGetResp);
			    subj.complete();

			    this._ElementSetGetSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionWriteResp) {
            let subj = this._ExpressionWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionWriteResp);
			    subj.complete();

			    this._ExpressionWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userRolesListResp) {
            let subj = this._UserRolesListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userRolesListResp);
			    subj.complete();

			    this._UserRolesListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.sendUserNotificationResp) {
            let subj = this._SendUserNotificationSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.sendUserNotificationResp);
			    subj.complete();

			    this._SendUserNotificationSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.diffractionPeakManualWriteResp) {
            let subj = this._DiffractionPeakManualWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.diffractionPeakManualWriteResp);
			    subj.complete();

			    this._DiffractionPeakManualWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionGroupListResp) {
            let subj = this._ExpressionGroupListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionGroupListResp);
			    subj.complete();

			    this._ExpressionGroupListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionDeleteResp) {
            let subj = this._ExpressionDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionDeleteResp);
			    subj.complete();

			    this._ExpressionDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.tagDeleteResp) {
            let subj = this._TagDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.tagDeleteResp);
			    subj.complete();

			    this._TagDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionListResp) {
            let subj = this._ExpressionListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionListResp);
			    subj.complete();

			    this._ExpressionListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.scanListResp) {
            let subj = this._ScanListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.scanListResp);
			    subj.complete();

			    this._ScanListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.scanUploadResp) {
            let subj = this._ScanUploadSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.scanUploadResp);
			    subj.complete();

			    this._ScanUploadSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.scanMetaLabelsResp) {
            let subj = this._ScanMetaLabelsSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.scanMetaLabelsResp);
			    subj.complete();

			    this._ScanMetaLabelsSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userNotificationSettingsResp) {
            let subj = this._UserNotificationSettingsSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userNotificationSettingsResp);
			    subj.complete();

			    this._UserNotificationSettingsSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userAddRoleResp) {
            let subj = this._UserAddRoleSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userAddRoleResp);
			    subj.complete();

			    this._UserAddRoleSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userDeleteRoleResp) {
            let subj = this._UserDeleteRoleSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userDeleteRoleResp);
			    subj.complete();

			    this._UserDeleteRoleSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.diffractionPeakStatusListResp) {
            let subj = this._DiffractionPeakStatusListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.diffractionPeakStatusListResp);
			    subj.complete();

			    this._DiffractionPeakStatusListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.diffractionPeakStatusDeleteResp) {
            let subj = this._DiffractionPeakStatusDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.diffractionPeakStatusDeleteResp);
			    subj.complete();

			    this._DiffractionPeakStatusDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.piquantConfigListResp) {
            let subj = this._PiquantConfigListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.piquantConfigListResp);
			    subj.complete();

			    this._PiquantConfigListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.regionOfInterestDeleteResp) {
            let subj = this._RegionOfInterestDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.regionOfInterestDeleteResp);
			    subj.complete();

			    this._RegionOfInterestDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.scanTriggerReImportResp) {
            let subj = this._ScanTriggerReImportSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.scanTriggerReImportResp);
			    subj.complete();

			    this._ScanTriggerReImportSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.tagCreateResp) {
            let subj = this._TagCreateSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.tagCreateResp);
			    subj.complete();

			    this._TagCreateSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.spectrumResp) {
            let subj = this._SpectrumSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.spectrumResp);
			    subj.complete();

			    this._SpectrumSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userListResp) {
            let subj = this._UserListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userListResp);
			    subj.complete();

			    this._UserListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.exportFilesResp) {
            let subj = this._ExportFilesSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.exportFilesResp);
			    subj.complete();

			    this._ExportFilesSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.imageDeleteResp) {
            let subj = this._ImageDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.imageDeleteResp);
			    subj.complete();

			    this._ImageDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.logReadResp) {
            let subj = this._LogReadSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.logReadResp);
			    subj.complete();

			    this._LogReadSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userNotificationResp) {
            let subj = this._UserNotificationSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userNotificationResp);
			    subj.complete();

			    this._UserNotificationSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.diffractionPeakManualDeleteResp) {
            let subj = this._DiffractionPeakManualDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.diffractionPeakManualDeleteResp);
			    subj.complete();

			    this._DiffractionPeakManualDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.diffractionPeakStatusWriteResp) {
            let subj = this._DiffractionPeakStatusWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.diffractionPeakStatusWriteResp);
			    subj.complete();

			    this._DiffractionPeakStatusWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionGroupSetResp) {
            let subj = this._ExpressionGroupSetSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionGroupSetResp);
			    subj.complete();

			    this._ExpressionGroupSetSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionGroupDeleteResp) {
            let subj = this._ExpressionGroupDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionGroupDeleteResp);
			    subj.complete();

			    this._ExpressionGroupDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.logSetLevelResp) {
            let subj = this._LogSetLevelSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.logSetLevelResp);
			    subj.complete();

			    this._LogSetLevelSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.scanLocationResp) {
            let subj = this._ScanLocationSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.scanLocationResp);
			    subj.complete();

			    this._ScanLocationSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.imageSetDefaultResp) {
            let subj = this._ImageSetDefaultSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.imageSetDefaultResp);
			    subj.complete();

			    this._ImageSetDefaultSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.dataModuleResp) {
            let subj = this._DataModuleSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.dataModuleResp);
			    subj.complete();

			    this._DataModuleSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.runTestResp) {
            let subj = this._RunTestSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.runTestResp);
			    subj.complete();

			    this._RunTestSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userHintsResp) {
            let subj = this._UserHintsSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userHintsResp);
			    subj.complete();

			    this._UserHintsSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userDismissHintResp) {
            let subj = this._UserDismissHintSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userDismissHintResp);
			    subj.complete();

			    this._UserDismissHintSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userRoleListResp) {
            let subj = this._UserRoleListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userRoleListResp);
			    subj.complete();

			    this._UserRoleListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.elementSetDeleteResp) {
            let subj = this._ElementSetDeleteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.elementSetDeleteResp);
			    subj.complete();

			    this._ElementSetDeleteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userDetailsWriteResp) {
            let subj = this._UserDetailsWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userDetailsWriteResp);
			    subj.complete();

			    this._UserDetailsWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.logGetLevelResp) {
            let subj = this._LogGetLevelSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.logGetLevelResp);
			    subj.complete();

			    this._LogGetLevelSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.dataModuleWriteResp) {
            let subj = this._DataModuleWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.dataModuleWriteResp);
			    subj.complete();

			    this._DataModuleWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.regionOfInterestResp) {
            let subj = this._RegionOfInterestSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.regionOfInterestResp);
			    subj.complete();

			    this._RegionOfInterestSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.tagListResp) {
            let subj = this._TagListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.tagListResp);
			    subj.complete();

			    this._TagListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userDetailsResp) {
            let subj = this._UserDetailsSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userDetailsResp);
			    subj.complete();

			    this._UserDetailsSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionWriteExecStatResp) {
            let subj = this._ExpressionWriteExecStatSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionWriteExecStatResp);
			    subj.complete();

			    this._ExpressionWriteExecStatSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.piquantSetVersionResp) {
            let subj = this._PiquantSetVersionSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.piquantSetVersionResp);
			    subj.complete();

			    this._PiquantSetVersionSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userNotificationSettingsWriteResp) {
            let subj = this._UserNotificationSettingsWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userNotificationSettingsWriteResp);
			    subj.complete();

			    this._UserNotificationSettingsWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.elementSetWriteResp) {
            let subj = this._ElementSetWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.elementSetWriteResp);
			    subj.complete();

			    this._ElementSetWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.piquantConfigVersionResp) {
            let subj = this._PiquantConfigVersionSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.piquantConfigVersionResp);
			    subj.complete();

			    this._PiquantConfigVersionSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.elementSetListResp) {
            let subj = this._ElementSetListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.elementSetListResp);
			    subj.complete();

			    this._ElementSetListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionWriteResultResp) {
            let subj = this._ExpressionWriteResultSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionWriteResultResp);
			    subj.complete();

			    this._ExpressionWriteResultSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.piquantVersionListResp) {
            let subj = this._PiquantVersionListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.piquantVersionListResp);
			    subj.complete();

			    this._PiquantVersionListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.diffractionPeakManualListResp) {
            let subj = this._DiffractionPeakManualListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.diffractionPeakManualListResp);
			    subj.complete();

			    this._DiffractionPeakManualListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.expressionResp) {
            let subj = this._ExpressionSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.expressionResp);
			    subj.complete();

			    this._ExpressionSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.imageUploadResp) {
            let subj = this._ImageUploadSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.imageUploadResp);
			    subj.complete();

			    this._ImageUploadSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.piquantConfigVersionsListResp) {
            let subj = this._PiquantConfigVersionsListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.piquantConfigVersionsListResp);
			    subj.complete();

			    this._PiquantConfigVersionsListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.regionOfInterestWriteResp) {
            let subj = this._RegionOfInterestWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.regionOfInterestWriteResp);
			    subj.complete();

			    this._RegionOfInterestWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.scanImageLocationsResp) {
            let subj = this._ScanImageLocationsSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.scanImageLocationsResp);
			    subj.complete();

			    this._ScanImageLocationsSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.imageListResp) {
            let subj = this._ImageListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.imageListResp);
			    subj.complete();

			    this._ImageListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.dataModuleListResp) {
            let subj = this._DataModuleListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.dataModuleListResp);
			    subj.complete();

			    this._DataModuleListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.pseudoIntensityResp) {
            let subj = this._PseudoIntensitySubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.pseudoIntensityResp);
			    subj.complete();

			    this._PseudoIntensitySubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.regionOfInterestListResp) {
            let subj = this._RegionOfInterestListSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.regionOfInterestListResp);
			    subj.complete();

			    this._RegionOfInterestListSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.scanMetaWriteResp) {
            let subj = this._ScanMetaWriteSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.scanMetaWriteResp);
			    subj.complete();

			    this._ScanMetaWriteSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }
        else if(wsmsg.userHintsToggleResp) {
            let subj = this._UserHintsToggleSubjects.get(wsmsg.msgId);
		    if(subj) {
			    subj.next(wsmsg.userHintsToggleResp);
			    subj.complete();

			    this._UserHintsToggleSubjects.delete(wsmsg.msgId);
				return true;
		    }
        }

        return false;
	}

    protected dispatchUpdate(wsmsg: WSMessage): boolean {
        if(wsmsg.userNotificationSettingsUpd) {
            this.userNotificationSettingsUpd$.next(wsmsg.userNotificationSettingsUpd);
			return true;
        }
        else if(wsmsg.scanListUpd) {
            this.scanListUpd$.next(wsmsg.scanListUpd);
			return true;
        }
        else if(wsmsg.userNotificationUpd) {
            this.userNotificationUpd$.next(wsmsg.userNotificationUpd);
			return true;
        }
        else if(wsmsg.userHintsUpd) {
            this.userHintsUpd$.next(wsmsg.userHintsUpd);
			return true;
        }
        else if(wsmsg.userDetailsUpd) {
            this.userDetailsUpd$.next(wsmsg.userDetailsUpd);
			return true;
        }
        else if(wsmsg.imageListUpd) {
            this.imageListUpd$.next(wsmsg.imageListUpd);
			return true;
        }

        return false;
	}
}