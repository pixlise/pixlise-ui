import { Component, OnInit } from '@angular/core';
import { APICachedDataService } from 'src/app/modules/pixlisecore/services/apicacheddata.service';
import { DetectorConfigListReq, DetectorConfigReq } from 'src/app/generated-protos/detector-config-msgs';
import { DetectorConfig } from 'src/app/generated-protos/detector-config';

interface DeviceDetails {
  config?: DetectorConfig;
  piquantVersions: string[];
  loading: boolean;
}

@Component({
  selector: 'app-device-config',
  standalone: false,
  templateUrl: './device-config.component.html',
  styleUrls: ['./device-config.component.scss']
})
export class DeviceConfigComponent implements OnInit {
  deviceIds: string[] = [];
  selectedDeviceId: string | null = null;
  selectedDeviceDetails: DeviceDetails | null = null;
  loading = true;

  constructor(private _cachedDataService: APICachedDataService) {}

  ngOnInit(): void {
    // Only fetch the list of device IDs
    this._cachedDataService.getDetectorConfigList(DetectorConfigListReq.create({}))
      .subscribe({
        next: (resp) => {
          this.deviceIds = resp.configs;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load detector config list:', err);
          this.loading = false;
        }
      });
  }

  onDeviceClick(deviceId: string): void {
    // Set selected device
    this.selectedDeviceId = deviceId;

    // Initialize loading state
    this.selectedDeviceDetails = {
      piquantVersions: [],
      loading: true
    };

    // Fetch detailed config for selected device
    this._cachedDataService.getDetectorConfig(DetectorConfigReq.create({ id: deviceId }))
      .subscribe({
        next: (resp) => {
          this.selectedDeviceDetails = {
            config: resp.config,
            piquantVersions: resp.piquantConfigVersions,
            loading: false
          };
        },
        error: (err) => {
          console.error(`Failed to load config for ${deviceId}:`, err);
          this.selectedDeviceDetails = {
            piquantVersions: [],
            loading: false
          };
        }
      });
  }
}
