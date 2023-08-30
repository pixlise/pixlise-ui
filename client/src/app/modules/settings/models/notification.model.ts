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
  // Notification Topic Names - these must be unique
  public static readonly notificationUserQuantComplete = "Quantification Complete";
  public static readonly notificationQuantShared = "Quantification Shared";
  public static readonly notificationNewDatasetAvailable = "New Dataset Available";
  public static readonly notificationDatasetSpectraUpdated = "Dataset Spectra Updated";
  public static readonly notificationDatasetImageUpdated = "Dataset Image Updated";
  public static readonly notificationDatasetHousekeepingUpdated = "Dataset Housekeeping Updated";
  public static readonly notificationElementSetShared = "Element Set Shared";
  public static readonly notificationMajorModuleRelease = "Major Module Release";
  public static readonly notificationMinorModuleRelease = "Minor Module Release";

  // All notification topic names - this is used to generate the list of topics in the UI and will be reflected in the DB
  public static readonly allNotifications = [
    NotificationSubscriptions.notificationUserQuantComplete,
    NotificationSubscriptions.notificationQuantShared,
    NotificationSubscriptions.notificationNewDatasetAvailable,
    NotificationSubscriptions.notificationDatasetSpectraUpdated,
    NotificationSubscriptions.notificationDatasetImageUpdated,
    NotificationSubscriptions.notificationDatasetHousekeepingUpdated,
    NotificationSubscriptions.notificationElementSetShared,
    NotificationSubscriptions.notificationMajorModuleRelease,
    NotificationSubscriptions.notificationMinorModuleRelease,
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
