import { Component, OnInit } from '@angular/core';
import { APICachedDataService } from 'src/app/modules/pixlisecore/services/apicacheddata.service';
import { DetectorConfigListReq, DetectorConfigReq } from 'src/app/generated-protos/detector-config-msgs';
import { DetectorConfig } from 'src/app/generated-protos/detector-config';
import { re } from 'mathjs';

interface DeviceConfigDisplay {
  id: string;
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
  devices: DeviceConfigDisplay[] = [];
  loading = true;
  configs: string[] = [];

  constructor(private _cachedDataService: APICachedDataService) {}

  ngOnInit(): void {
    // First, get the list of all detector configs
    this._cachedDataService.getDetectorConfigList(DetectorConfigListReq.create({}))
      .subscribe({
        next: (resp) => {
            this.configs = resp.configs;
          this.loading = false;

          // Initialize device list
          this.devices = resp.configs.map(configId => ({
            id: configId,
            piquantVersions: [],
            loading: true
          }));

          // Fetch detailed config for each device
          this.devices.forEach(device => {
            this._cachedDataService.getDetectorConfig(DetectorConfigReq.create({ id: device.id }))
              .subscribe({
                next: (configResp) => {
                  device.config = configResp.config;
                  device.piquantVersions = configResp.piquantConfigVersions;
                  device.loading = false;
                },
                error: (err) => {
                  console.error(`Failed to load config for ${device.id}:`, err);
                  device.loading = false;
                }
              });
          });
        },
        error: (err) => {
          console.error('Failed to load detector config list:', err);
          this.loading = false;
        }
      });
  }
}
