import { Component, HostListener, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ScreenConfiguration } from "../../../../../generated-protos/screen-configuration";
import { ROIItem, ROIItemSummary } from "../../../../../generated-protos/roi";
import { AnalysisLayoutService } from "../../../../analysis/analysis.module";
import { combineLatest, Observable, of, scan, Subscription } from "rxjs";
import { APICachedDataService } from "../../../../pixlisecore/services/apicacheddata.service";
import { ScanListReq } from "../../../../../generated-protos/scan-msgs";
import { ScanItem } from "../../../../../generated-protos/scan";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "../../../../../generated-protos/roi-msgs";
import { APIDataService, SnackbarService } from "../../../../pixlisecore/pixlisecore.module";
import { ScreenConfigurationGetReq } from "../../../../../generated-protos/screen-configuration-msgs";
import { QuantGetReq, QuantGetResp } from "../../../../../generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "../../../../../generated-protos/quantification-meta";
import { ROIService } from "../../../../roi/services/roi.service";
import { SearchParams } from "../../../../../generated-protos/search-params";
import { SearchableListItem } from "../../../../pixlisecore/components/atoms/searchable-list/searchable-list.component";
import { levenshteinDistance } from "../../../../../utils/search";
import { ImageGetReq, ImageGetResp, ImageListReq, ImageListResp } from "../../../../../generated-protos/image-msgs";
import { ScanImage } from "../../../../../generated-protos/image";
import { SDSFields } from "../../../../../utils/utils";

export interface DuplicateWorkspaceDialogData {
  workspace: ScreenConfiguration;
  workspaceId: string;
}

export interface DuplicateWorkspaceDialogResult {}

export type DatasetProducts = {
  rois: ROIItem[];
  quants: QuantificationSummary[];
  accordionOpen: boolean;
  scanItem: ScanItem;
  scanName: string;
  images: ScanImage[];
};

@Component({
  selector: "duplicate-workspace-dialog",
  templateUrl: "./duplicate-workspace-dialog.component.html",
  styleUrls: ["./duplicate-workspace-dialog.component.scss"],
})
export class DuplicateWorkspaceDialogComponent {
  private _subs = new Subscription();

  workspaceName: string = "";
  workspacePlaceholder: string = "Workspace Name";
  private _newWorkspace: ScreenConfiguration | null = null;

  replaceDataProducts: boolean = false;
  canReplaceDataProducts: boolean = true;

  public static DEFAULT_DUPLICATE_OPTIONS = [
    { id: "no-replace", name: "Don't Replace", icon: "assets/icons/arrow-right.svg", color: "#bcbcbc", default: true },
    { id: "remove", name: "Remove", icon: "assets/button-icons/delete-gray.svg", color: "#bcbcbc", default: true },
  ];

  allScanSearchableItems: SearchableListItem[] = [];
  allScans: ScanItem[] = [];

  searchableImagesForScan: { [scanId: string]: SearchableListItem[] } = {};
  searchableQuantsForScans: { [scanId: string]: SearchableListItem[] } = {};
  searchableRoisForScans: { [scanId: string]: SearchableListItem[] } = {};
  productsByDataset: { [datasetId: string]: DatasetProducts } = {};

  idReplacements: { [id: string]: string } = {};

  addScanList: SearchableListItem[] = [];
  private _scanSearchText: string = "";

  public loading: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DuplicateWorkspaceDialogData,
    private _analysisLayoutService: AnalysisLayoutService,
    private _roiService: ROIService,
    private _cachedDataService: APICachedDataService,
    private _apiDataService: APIDataService,
    private _snackbarService: SnackbarService,
    public dialogRef: MatDialogRef<DuplicateWorkspaceDialogComponent, DuplicateWorkspaceDialogResult>
  ) {
    this.workspacePlaceholder = data.workspace.name;
  }

  ngOnInit(): void {
    this.loading = true;
    this._apiDataService.sendScreenConfigurationGetRequest(ScreenConfigurationGetReq.create({ id: this.data.workspaceId })).subscribe({
      next: response => {
        let workspace = response?.screenConfiguration;
        if (!workspace) {
          return;
        }

        this._newWorkspace = ScreenConfiguration.create(workspace);

        let workspaceRoiIds = this._analysisLayoutService.getROIIDsFromScreenConfiguration(workspace);
        let workspaceImageIds = this._analysisLayoutService.getImageIDsFromScreenConfiguration(workspace);

        let roiRequests: Observable<RegionOfInterestGetResp | null>[] = workspaceRoiIds.map(roiId =>
          this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId }))
        );
        if (roiRequests.length === 0) {
          roiRequests.push(of(null));
        }

        let imageRequests: Observable<ImageGetResp | null>[] = workspaceImageIds.map(imageId => {
          return this._cachedDataService.getImageMeta(ImageGetReq.create({ imageName: imageId }));
        });

        let quantRequests: Observable<QuantGetResp | null>[] = [];
        let quantsForScansRequests: Observable<QuantificationSummary[]>[] = [];
        let roisForScansRequests: Observable<Record<string, ROIItemSummary>>[] = [];

        let scanIds: string[] = [];
        Object.entries(this.data.workspace.scanConfigurations).forEach(([datasetId, scanConfig]) => {
          if (scanConfig.quantId) {
            quantRequests.push(this._cachedDataService.getQuant(QuantGetReq.create({ quantId: scanConfig.quantId })));
          }

          if (datasetId) {
            quantsForScansRequests.push(this._analysisLayoutService.fetchQuantsForScanAsync(datasetId));
            roisForScansRequests.push(this._roiService.searchROIsAsync(SearchParams.create({ scanId: datasetId }), true));
            scanIds.push(datasetId);
          }
        });

        let imagesForScanReq = this._cachedDataService.getImageList(ImageListReq.create({ scanIds: scanIds }));

        if (quantRequests.length === 0) {
          quantRequests.push(of(null));
        }

        this._subs.add(
          this._cachedDataService.getScanList(ScanListReq.create()).subscribe(scanList => {
            let scanItems = scanList.scans;
            this.allScans = scanItems;
            this.allScanSearchableItems = [
              ...DuplicateWorkspaceDialogComponent.DEFAULT_DUPLICATE_OPTIONS,
              ...scanItems.map(scan => ({
                icon: "assets/icons/datasets.svg",
                id: scan.id,
                name: this.getScanName(scan),
              })),
            ];

            this.onSearchAddScanList(this._scanSearchText);

            combineLatest([...roiRequests, ...quantRequests, ...quantsForScansRequests, ...roisForScansRequests, ...imageRequests, imagesForScanReq]).subscribe({
              next: response => {
                this.loading = false;

                let rois = response
                  .slice(0, roiRequests.length)
                  .map(roi => (roi as RegionOfInterestGetResp)?.regionOfInterest)
                  .filter(roi => roi) as ROIItem[];
                let quants = response
                  .slice(roiRequests.length, roiRequests.length + quantRequests.length)
                  .map(quant => (quant as QuantGetResp)?.summary)
                  .filter(quant => quant) as QuantificationSummary[];

                let quantsForScans = response
                  .slice(roiRequests.length + quantRequests.length, roiRequests.length + quantRequests.length + quantsForScansRequests.length)
                  .map(quants => quants as QuantificationSummary[])
                  .filter(quants => quants);

                let roisForScans = response
                  .slice(
                    roiRequests.length + quantRequests.length + quantsForScansRequests.length,
                    roiRequests.length + quantRequests.length + quantsForScansRequests.length + roisForScansRequests.length
                  )
                  .map(rois => rois as Record<string, ROIItemSummary>);

                let imagesInWorkspace = response
                  .slice(
                    roiRequests.length + quantRequests.length + quantsForScansRequests.length + roisForScansRequests.length,
                    roiRequests.length + quantRequests.length + quantsForScansRequests.length + roisForScansRequests.length + imageRequests.length
                  )
                  .map(image => image as ImageGetResp);

                let imagesForScansResp = response.slice(
                  roiRequests.length + quantRequests.length + quantsForScansRequests.length + roisForScansRequests.length + imageRequests.length
                );

                let allImages: ScanImage[] = [];

                if (imagesForScansResp.length > 0) {
                  let imageListing = imagesForScansResp[0] as ImageListResp;
                  if (imageListing?.images) {
                    allImages = imageListing.images;
                  }
                }
                roisForScans.forEach((rois, i) => {
                  Object.values(rois).forEach(roi => {
                    this.searchableRoisForScans[roi.scanId] = this.searchableRoisForScans[roi.scanId] || [
                      ...DuplicateWorkspaceDialogComponent.DEFAULT_DUPLICATE_OPTIONS,
                    ];
                    this.searchableRoisForScans[roi.scanId].push({
                      icon: "assets/icons/roi.svg",
                      id: roi.id,
                      name: roi.name,
                    });
                  });
                });

                quantsForScans.forEach((quants, i) => {
                  let scanId = quants[0].scanId;
                  this.searchableQuantsForScans[scanId] = [
                    ...DuplicateWorkspaceDialogComponent.DEFAULT_DUPLICATE_OPTIONS,
                    ...quants.map(quant => ({
                      icon: "assets/icons/quant.svg",
                      id: quant.id,
                      name: quant.params?.userParams?.name || quant.id,
                    })),
                  ];
                });

                allImages.forEach(image => {
                  let scanId = image?.originScanId || image?.associatedScanIds?.[0];
                  if (!scanId) {
                    return;
                  }

                  this.searchableImagesForScan[scanId] = this.searchableImagesForScan[scanId] || [...DuplicateWorkspaceDialogComponent.DEFAULT_DUPLICATE_OPTIONS];
                  this.searchableImagesForScan[scanId].push({
                    icon: "assets/icons/image-gray.svg",
                    id: image.imagePath,
                    name: this.getImageName(image),
                  });
                });

                Object.entries(this.data.workspace.scanConfigurations).forEach(([datasetId, scanConfig]) => {
                  let scanItem = scanItems.find(scan => scan.id === scanConfig.id);
                  if (!scanItem) {
                    return;
                  }

                  let roisForDataset = rois.filter(roi => roi.scanId === datasetId);
                  let quantsForDataset = quants.filter(quant => quant.scanId === datasetId);
                  let imagesForDataset = imagesInWorkspace
                    .filter(image => (image?.image && image.image.originScanId === datasetId) || image.image?.associatedScanIds?.includes(datasetId))
                    .map(image => image.image) as ScanImage[];

                  this.productsByDataset[datasetId] = {
                    rois: roisForDataset,
                    quants: quantsForDataset,
                    images: imagesForDataset,
                    accordionOpen: false,
                    scanItem: scanItem,
                    scanName: this.getScanName(scanItem),
                  };
                });
              },
              error: () => {
                this.loading = false;
                this._snackbarService.openError("Failed to load workspace items");
              },
            });
          })
        );
      },
      error: () => {
        this.loading = false;
        this._snackbarService.openError("Failed to load workspace");
      },
    });
  }

  getImageName(image: ScanImage) {
    return image.imagePath.split("/").pop() || "";
  }

  replaceScan(scanId: string, newScanId: string): void {
    this.idReplacements[scanId] = newScanId;

    this.productsByDataset[scanId].accordionOpen =
      (this.searchableRoisForScans[newScanId]?.length > 0 || this.searchableQuantsForScans[newScanId]?.length > 0) &&
      newScanId !== "no-replace" &&
      newScanId !== "remove";

    this._analysisLayoutService.fetchQuantsForScanAsync(newScanId).subscribe(quants => {
      this.searchableQuantsForScans[newScanId] = [
        ...DuplicateWorkspaceDialogComponent.DEFAULT_DUPLICATE_OPTIONS,
        ...quants.map(quant => ({
          icon: "assets/icons/quant.svg",
          id: quant.id,
          name: quant.params?.userParams?.name || quant.id,
        })),
      ];

      if (!this.productsByDataset[scanId].accordionOpen && quants.length > 0) {
        this.productsByDataset[scanId].accordionOpen = newScanId !== "no-replace" && newScanId !== "remove";
      }

      // Find best guess for replacement
      this.productsByDataset[scanId].quants.forEach(existingQuant => {
        let bestGuess = this.searchableQuantsForScans[newScanId].find(
          quant => quant.name.toLowerCase() === (existingQuant.params?.userParams?.name || "").toLowerCase()
        );

        if (bestGuess) {
          this.idReplacements[existingQuant.id] = bestGuess.id;
        } else {
          // We don't want to remove a quant unless we absolutely have to, so look for one that matches quant mode
          // and has many of the same overlapping elements
          let existingQuantMode = existingQuant.params?.userParams?.quantMode;
          let existingElements = existingQuant.params?.userParams?.elements || [];

          let bestNonNameMatch: string = "";
          let bestOverlapCount = 0;
          let bestLevenshteinDistance = -1;

          let sameModeQuants = quants.filter(quant => quant.params?.userParams?.quantMode === existingQuantMode);
          sameModeQuants.forEach(quant => {
            let overlappingElements = quant.params?.userParams?.elements?.filter(element => existingElements.includes(element)) || [];

            if (overlappingElements.length > bestOverlapCount) {
              bestNonNameMatch = quant.id;
              bestOverlapCount = overlappingElements.length;
              if (quant.params?.userParams?.name && existingQuant.params?.userParams?.name) {
                bestLevenshteinDistance = levenshteinDistance(quant.params.userParams.name, existingQuant.params.userParams.name);
              } else {
                bestLevenshteinDistance = -1;
              }
            } else if (overlappingElements.length === bestOverlapCount) {
              // If we have a tie, prefer the one with the most similar name
              if (quant.params?.userParams?.name && existingQuant.params?.userParams?.name) {
                let distance = levenshteinDistance(quant.params.userParams.name, existingQuant.params.userParams.name);
                if (distance < bestLevenshteinDistance) {
                  bestNonNameMatch = quant.id;
                  bestLevenshteinDistance = distance;
                }
              }
            }
          });

          if (bestNonNameMatch) {
            this.idReplacements[existingQuant.id] = bestNonNameMatch;
          } else {
            // If we can't find a good match, remove the quant. It will be brought back using auto logic on first load
            this.idReplacements[existingQuant.id] = "remove";
          }
        }
      });
    });

    this._cachedDataService.getImageList(ImageListReq.create({ scanIds: [newScanId] })).subscribe({
      next: response => {
        let images = response?.images || [];
        this.searchableImagesForScan[newScanId] = [
          ...DuplicateWorkspaceDialogComponent.DEFAULT_DUPLICATE_OPTIONS,
          ...images.map(image => ({
            icon: "assets/icons/image-gray.svg",
            id: image.imagePath,
            name: this.getImageName(image),
          })),
        ];

        if (!this.productsByDataset[scanId].accordionOpen && images.length > 0) {
          this.productsByDataset[scanId].accordionOpen = newScanId !== "no-replace" && newScanId !== "remove";
        }

        this.productsByDataset[scanId].images.forEach(existingImage => {
          let existingBaseName = this.getImageName(existingImage);
          let bestGuess = this.searchableImagesForScan[newScanId].find(image => {
            return image.name.toLowerCase() === existingBaseName.toLowerCase();
          });

          if (bestGuess) {
            this.idReplacements[existingImage.imagePath] = bestGuess.id;
          } else {
            // Check if is _MSA or is _VIS first and then find the respective
            let existingIsMSA = existingBaseName.includes("MSA_");
            if (existingIsMSA) {
              let newMSA = this.searchableImagesForScan[newScanId].find(image => image.name.includes("MSA_"));
              if (newMSA) {
                this.idReplacements[existingImage.imagePath] = newMSA.id;
                return;
              }
            } else if (existingBaseName.includes("VIS_")) {
              let newVIS = this.searchableImagesForScan[newScanId].find(image => image.name.includes("VIS_"));
              if (newVIS) {
                this.idReplacements[existingImage.imagePath] = newVIS.id;
                return;
              }
            }
            // Else check SDS field and find largest overlapping PMCs
            // Also check ROIs to see if any have pixels/associated scans that overlap with the image
            // SDSFields.makeFromFileName()
            else {
              let existingSDS = SDSFields.makeFromFileName(existingBaseName);
              let existingExtension = existingBaseName.split(".").pop() || "";
              let bestSDSMatch: string = "";
              let bestPMCCount = 0;
              let bestFieldMatchCount = 0;

              let fieldsToCheck = [
                "camSpecific",
                "colourFilter",
                "compression",
                "downsample",
                "driveStr",
                "geometry",
                "instrument",
                "prodType",
                "producer",
                "special",
                "thumbnail",
                "venue",
              ] as (keyof SDSFields)[];

              let imagesWithMatchingExtension = this.searchableImagesForScan[newScanId].filter(image => image.name.endsWith(existingExtension));
              if (!existingSDS && imagesWithMatchingExtension.length > 0) {
                this.idReplacements[existingImage.imagePath] = imagesWithMatchingExtension[0].id;
                return;
              }

              imagesWithMatchingExtension.forEach(image => {
                let sds = SDSFields.makeFromFileName(image.name);
                if (!sds) {
                  return;
                }

                let fieldMatchCount = 0;
                fieldsToCheck.forEach(field => {
                  if (existingSDS![field] === sds[field]) {
                    fieldMatchCount++;
                  }
                });

                if (fieldMatchCount > bestFieldMatchCount) {
                  bestSDSMatch = image.id;
                  bestFieldMatchCount = fieldMatchCount;
                } else if (fieldMatchCount === bestFieldMatchCount) {
                  let existingPMCCount = existingSDS!.PMC;
                  if (Math.abs(sds.PMC - existingPMCCount) < Math.abs(bestPMCCount - existingPMCCount)) {
                    bestSDSMatch = image.id;
                    bestPMCCount = sds.PMC;
                  }
                }
              });

              if (bestSDSMatch) {
                this.idReplacements[existingImage.imagePath] = bestSDSMatch;
              } else {
                this.idReplacements[existingImage.imagePath] = "remove";
              }
            }
          }
        });
      },
      error: () => {
        this._snackbarService.openError("Failed to load images for scan");
      },
    });

    this._roiService.searchROIsAsync(SearchParams.create({ scanId: newScanId }), true).subscribe(rois => {
      this.searchableRoisForScans[newScanId] = [
        ...DuplicateWorkspaceDialogComponent.DEFAULT_DUPLICATE_OPTIONS,
        ...Object.values(rois).map(roi => ({
          icon: "assets/icons/roi.svg",
          id: roi.id,
          name: roi.name,
        })),
      ];

      if (!this.productsByDataset[scanId].accordionOpen && Object.keys(rois).length > 0) {
        this.productsByDataset[scanId].accordionOpen = newScanId !== "no-replace" && newScanId !== "remove";
      }

      // Find best guess for replacement
      this.productsByDataset[scanId].rois.forEach(existingRoi => {
        let bestGuess = this.searchableRoisForScans[newScanId].find(roi => roi.name.toLowerCase() === existingRoi.name.toLowerCase());

        if (bestGuess) {
          this.idReplacements[existingRoi.id] = bestGuess.id;
        } else if (existingRoi.isMIST) {
          // If we can't find a perfect match and this is a MIST ROI, remove it
          this.idReplacements[existingRoi.id] = "remove";
        } else {
          // Match on tags if we can't find an exact name match
          // If we have a single tag match, use that
          // If we have multiple tag matches, use the one with the most similar name

          let roisToSearch = this.searchableRoisForScans[newScanId];
          let tagMatchedROIs: ROIItemSummary[] = [];
          let tagCount = 0;
          Object.values(rois).forEach(roi => {
            let matchingTagCount = roi.tags.filter(tag => existingRoi.tags.includes(tag)).length;
            if (matchingTagCount > tagCount) {
              tagMatchedROIs = [roi];
              tagCount = matchingTagCount;
            } else if (matchingTagCount === tagCount) {
              tagMatchedROIs.push(roi);
            }
          });

          if (tagCount > 0 && tagMatchedROIs.length === 1) {
            this.idReplacements[existingRoi.id] = tagMatchedROIs[0].id;
          } else {
            if (tagMatchedROIs.length > 1) {
              roisToSearch = roisToSearch.filter(roi => {
                return tagMatchedROIs.find(match => match.id === roi.id);
              });
            }

            // Can't find an exact match, so expand search to include similar names with a levenshtein distance of 1
            let bestNonExactMatch: string = "";
            let bestLevenshteinDistance = -1;
            roisToSearch.forEach(roi => {
              let distance = levenshteinDistance(roi.name, existingRoi.name);
              if (bestLevenshteinDistance === -1 || distance < bestLevenshteinDistance) {
                bestNonExactMatch = roi.id;
                bestLevenshteinDistance = distance;
              }
            });

            if (bestNonExactMatch && (bestLevenshteinDistance <= 1 || tagMatchedROIs.length > 0)) {
              this.idReplacements[existingRoi.id] = bestNonExactMatch;
            } else {
              this.idReplacements[existingRoi.id] = "remove";
            }
          }
        }
      });
    });
  }

  get scanSearchText() {
    return this._scanSearchText;
  }

  set scanSearchText(value: string) {
    this._scanSearchText = value;
    this.onSearchAddScanList(value);
  }

  onSearchAddScanList(text: string) {
    this.addScanList = this.allScanSearchableItems.filter(scan => scan.name.toLowerCase().includes(text.toLowerCase()));
  }

  onAddScanSearchClick(evt: any) {
    evt.stopPropagation();
  }

  onScanSearchMenu() {
    const searchBox = document.getElementsByClassName("scan-search");
    if (searchBox.length > 0) {
      (searchBox[0] as any).focus();
    }
  }

  getScanName(scan: ScanItem): string {
    return scan?.meta && scan?.title ? `Sol ${scan.meta["Sol"]}: ${scan.title}` : scan?.title;
  }

  get datasetProducts() {
    return Object.values(this.productsByDataset);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this._newWorkspace) {
      return;
    }

    this._newWorkspace.name = this.workspaceName || this.workspacePlaceholder;
    this._newWorkspace.id = "";
    this._newWorkspace.snapshotParentId = "";

    if (this.replaceDataProducts && this.canReplaceDataProducts) {
      Object.entries(this.idReplacements).forEach(([oldId, newId]) => {
        if (newId === "remove") {
          this._newWorkspace = this._analysisLayoutService.removeIdFromScreenConfiguration(this._newWorkspace!, oldId);
        } else if (newId !== "no-replace") {
          this._newWorkspace = this._analysisLayoutService.replaceIdInScreenConfiguration(this._newWorkspace!, oldId, newId);
        }
      });
    }

    // Remove all ids from widgets as we don't want to duplicate them
    this._newWorkspace.layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        widget.id = "";
      });
    });

    this._analysisLayoutService.writeScreenConfiguration(this._newWorkspace, undefined, false, () => {
      this._snackbarService.openSuccess(`Workspace ${this._newWorkspace!.name} duplicated successfully`);
      this.dialogRef.close(true);
    });
  }

  // listen for enter key to confirm
  @HostListener("document:keydown.enter", ["$event"])
  onKeydown(event: any) {
    if (event.key === "Enter") {
      this.onConfirm();
    }
  }
}
