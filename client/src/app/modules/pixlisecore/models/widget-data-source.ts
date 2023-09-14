// The Ids associated with one or more scans that we wish to display in a widget
export class ScanDataIds {
  constructor(
    public quantId: string,
    public roiIds: string[]
  ) {}
}

export type WidgetDataIds = Map<string, ScanDataIds>;
