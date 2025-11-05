import { Component, OnInit } from '@angular/core';
import { APICachedDataService } from 'src/app/modules/pixlisecore/services/apicacheddata.service';
import { DetectorConfigListReq, DetectorConfigReq } from 'src/app/generated-protos/detector-config-msgs';
import { DetectorConfig } from 'src/app/generated-protos/detector-config';
import { PiquantConfigVersionReq } from 'src/app/generated-protos/piquant-msgs';
import { PiquantConfig } from 'src/app/generated-protos/piquant-config';

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

  selectedPiquantVersion: string | null = null;
  piquantConfigDetails: PiquantConfig | undefined = undefined;
  loadingPiquantConfig = false;

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

    // Reset piquant version selection when changing devices
    this.selectedPiquantVersion = null;
    this.piquantConfigDetails = undefined;

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

  onPiquantVersionClick(version: string): void {
    this.selectedPiquantVersion = version;
    this.loadingPiquantConfig = true;
    this.piquantConfigDetails = undefined;

    // Parse the version string (format is usually "configName:version")
    const parts = version.split(':');
    const configName = parts[0];
    const versionStr = parts.length > 1 ? parts[1] : '';

    // Fetch the piquant config details
    this._cachedDataService.getPiquantConfigVersion(
      PiquantConfigVersionReq.create({
        configId: configName,
        version: versionStr
      })
    ).subscribe({
      next: (resp) => {
        this.piquantConfigDetails = resp.piquantConfig;
        this.loadingPiquantConfig = false;
      },
      error: (err) => {
        console.error(`Failed to load piquant config ${version}:`, err);
        this.loadingPiquantConfig = false;
      }
    });
  }
}
