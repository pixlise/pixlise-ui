export class NotificationMethod {
  constructor(
    public ui: boolean = false,
    public email: boolean = false
  ) {}
}

export class NotificationConfig {
  constructor(public method: NotificationMethod) {}
}

export class NotificationTopic {
  constructor(
    public name: string,
    public config: NotificationConfig
  ) {}
}

export class NotificationSubscriptions {
  // Notification Topic Names - these must be unique and must be in sync with the API topic definitions:
  // At time of writing, these are defined in the API at api\notificationSender\notifications.go
  public static readonly NOTIF_TOPIC_SCAN_NEW = "New Dataset Available";
  public static readonly NOTIF_TOPIC_SCAN_UPDATED = "Dataset Updated";
  public static readonly NOTIF_TOPIC_QUANT_COMPLETE = "Qunatification Complete";
  public static readonly NOTIF_TOPIC_IMAGE_NEW = "New Image For Dataset";
  public static readonly NOTIF_TOPIC_OBJECT_SHARED = "Object Shared";

  // Initial list had items that didn't make it:
  // public static readonly notificationQuantShared = "Quantification Shared";
  // public static readonly notificationDatasetSpectraUpdated = "Dataset Spectra Updated";
  // public static readonly notificationDatasetImageUpdated = "Dataset Image Updated";
  // public static readonly notificationDatasetHousekeepingUpdated = "Dataset Housekeeping Updated";
  // public static readonly notificationElementSetShared = "Element Set Shared";
  // public static readonly notificationMajorModuleRelease = "Major Module Release";
  // public static readonly notificationMinorModuleRelease = "Minor Module Release";

  // All notification topic names - this is used to generate the list of topics in the UI and will be reflected in the DB
  public static readonly allNotifications = [
    NotificationSubscriptions.NOTIF_TOPIC_SCAN_NEW,
    NotificationSubscriptions.NOTIF_TOPIC_SCAN_UPDATED,
    NotificationSubscriptions.NOTIF_TOPIC_QUANT_COMPLETE,
    NotificationSubscriptions.NOTIF_TOPIC_IMAGE_NEW,
    NotificationSubscriptions.NOTIF_TOPIC_OBJECT_SHARED,
  ];

  constructor(public topics: NotificationTopic[]) {}
}

export class NotificationSetting {
  public id: string = "";

  constructor(
    public label: string,
    public method: NotificationMethod = new NotificationMethod()
  ) {
    this.id = label;
  }
}
