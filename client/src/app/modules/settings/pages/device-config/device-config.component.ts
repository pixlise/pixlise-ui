import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { APICachedDataService } from 'src/app/modules/pixlisecore/services/apicacheddata.service';
import { DetectorConfigListReq, DetectorConfigReq } from 'src/app/generated-protos/detector-config-msgs';
import { DetectorConfig } from 'src/app/generated-protos/detector-config';
import { PiquantConfigVersionReq, PiquantConfigFileReq } from 'src/app/generated-protos/piquant-msgs';
import { PiquantConfig } from 'src/app/generated-protos/piquant-config';
import { TextFileViewingDialogComponent, TextFileViewingDialogData } from 'src/app/modules/pixlisecore/components/atoms/text-file-viewing-dialog/text-file-viewing-dialog.component';
import { map } from 'rxjs/operators';

interface DeviceDetails {
  config?: DetectorConfig;
  piquantVersions: string[];
  loading: boolean;
}

interface ConfigOption {
  id: string;
  label: string;
  type: 'client' | 'version';
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

  // Middle column: config options (Client + versions)
  configOptions: ConfigOption[] = [];
  selectedConfigOption: ConfigOption | null = null;

  // Right column: details for selected config option
  piquantConfigDetails: PiquantConfig | undefined = undefined;
  loadingConfigDetails = false;

  constructor(
    private _cachedDataService: APICachedDataService,
    private _dialog: MatDialog
  ) {}

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

    // Reset middle and right columns
    this.configOptions = [];
    this.selectedConfigOption = null;
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

          // Build config options: "Client" + all piquant versions
          this.configOptions = [
            { id: 'client', label: 'Client', type: 'client' }
          ];

          // Add version options
          resp.piquantConfigVersions.forEach(version => {
            this.configOptions.push({
              id: version,
              label: version,
              type: 'version'
            });
          });
        },
        error: (err) => {
          console.error(`Failed to load config for ${deviceId}:`, err);
          this.selectedDeviceDetails = {
            piquantVersions: [],
            loading: false
          };
          this.configOptions = [];
        }
      });
  }

  onConfigOptionClick(option: ConfigOption): void {
    this.selectedConfigOption = option;
    this.piquantConfigDetails = undefined;

    // If clicking "Client", no need to fetch anything (data already loaded)
    if (option.type === 'client') {
      this.loadingConfigDetails = false;
      return;
    }

    // If clicking a version, fetch the piquant config details
    if (option.type === 'version') {
      this.loadingConfigDetails = true;

      if (!this.selectedDeviceId) {
        console.error('No device selected');
        this.loadingConfigDetails = false;
        return;
      }

      // Fetch the piquant config details
      this._cachedDataService.getPiquantConfigVersion(
        PiquantConfigVersionReq.create({
          configId: this.selectedDeviceId,
          version: option.id
        })
      ).subscribe({
        next: (resp) => {
          this.piquantConfigDetails = resp.piquantConfig;
          this.loadingConfigDetails = false;
        },
        error: (err) => {
          console.error(`Failed to load piquant config ${option.id}:`, err);
          this.loadingConfigDetails = false;
        }
      });
    }
  }

  onFileClick(filename: string): void {
    if (!this.selectedDeviceId || !this.selectedConfigOption) {
      return;
    }

    // Create an observable for the file contents
    const content$ = this._cachedDataService.getPiquantConfigFile(
      PiquantConfigFileReq.create({
        configId: this.selectedDeviceId,
        version: this.selectedConfigOption.id,
        filename: filename
      })
    ).pipe(
      map((resp) => resp.contents)
    );

    // Open the dialog with the file contents
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new TextFileViewingDialogData(filename, content$, false, 0);

    const dialogRef = this._dialog.open(TextFileViewingDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(
      () => {},
      (err) => {
        console.error(`Failed to display file ${filename}:`, err);
      }
    );
  }
}
