import { Injectable, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, combineLatest, forkJoin, map, mergeAll, mergeMap, Observable, of, Subscription, switchMap } from "rxjs";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanConfiguration, ScreenConfiguration } from "../../../generated-protos/screen-configuration";
import { ScreenConfigurationGetReq, ScreenConfigurationListReq } from "../../../generated-protos/screen-configuration-msgs";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "../../../generated-protos/roi-msgs";
import { ROIItem, ROIItemSummary } from "../../../generated-protos/roi";
import { QuantGetReq, QuantGetResp } from "../../../generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "../../../generated-protos/quantification-meta";
import { ImageGetReq, ImageGetResp, ImageListReq, ImageListResp } from "../../../generated-protos/image-msgs";
import { ScanImage } from "../../../generated-protos/image";
import { ScanItem } from "../../../generated-protos/scan";
import { ScanListReq } from "../../../generated-protos/scan-msgs";
import { SearchParams } from "../../../generated-protos/search-params";
import { ROIService } from "../../roi/services/roi.service";
import { AnalysisLayoutService } from "./analysis-layout.service";
import { SearchableListItem } from "../../pixlisecore/components/atoms/searchable-list/searchable-list.component";
import { levenshteinDistance } from "../../../utils/search";
import { SDSFields } from "../../../utils/utils";

export type DatasetProducts = {
  workspaceROIs: ROIItem[];
  searchableROIs: SearchableListItem[];
  workspaceQuants: QuantificationSummary[];
  searchableQuants: SearchableListItem[];
  workspaceImages: ScanImage[];
  searchableImages: SearchableListItem[];
  scanItem: ScanItem;
  scanName: string;
};

export type DuplicateDatasetProducts = {
  rois: ROIItem[];
  quants: QuantificationSummary[];
  accordionOpen: boolean;
  scanItem: ScanItem;
  scanName: string;
  images: ScanImage[];
};

@Injectable({
  providedIn: "root",
})
export class WorkspaceService implements OnDestroy {
  private _subs = new Subscription();

  public static DEFAULT_DUPLICATE_OPTIONS = [
    { id: "no-replace", name: "Don't Replace", icon: "assets/icons/arrow-right.svg", color: "#bcbcbc", default: true },
    { id: "remove", name: "Remove", icon: "assets/button-icons/delete-gray.svg", color: "#bcbcbc", default: true },
  ];

  constructor(
    private _router: Router,
    private _apiDataService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _snackService: SnackbarService,
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {}

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  fetchWorkspaceSnapshots(workspaceId: string): Observable<ScreenConfiguration[]> {
    return this._apiDataService.sendScreenConfigurationListRequest(ScreenConfigurationListReq.create({ snapshotParentId: workspaceId })).pipe(
      map(res => {
        let snapshots = res.screenConfigurations;
        snapshots.sort((a, b) => {
          return (a.owner?.createdUnixSec || 0) - (b.owner?.createdUnixSec || 0);
        });

        return snapshots;
      }),
      catchError(err => {
        this._snackService.openError(err);
        return of([]);
      })
    );
  }

  fetchWorkspaceProducts(
    workspaceId: string,
    scanConfigurations: { [id: string]: ScanConfiguration } | undefined = undefined
  ): Observable<{ workspace: ScreenConfiguration | undefined; products: { [datasetId: string]: DatasetProducts } }> {
    return this._apiDataService.sendScreenConfigurationGetRequest(ScreenConfigurationGetReq.create({ id: workspaceId })).pipe(
      switchMap(response => {
        let workspace = response?.screenConfiguration;
        if (!workspace) {
          return of({ workspace: undefined, products: {} });
        }

        scanConfigurations = scanConfigurations || response.screenConfiguration?.scanConfigurations || {};

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

        Object.entries(scanConfigurations).forEach(([datasetId, scanConfig]) => {
          if (scanConfig.quantId) {
            quantRequests.push(this._cachedDataService.getQuant(QuantGetReq.create({ quantId: scanConfig.quantId })));
          }

          if (datasetId) {
            quantsForScansRequests.push(this._analysisLayoutService.fetchQuantsForScanAsync(datasetId));
            roisForScansRequests.push(this._roiService.searchROIsAsync(SearchParams.create({ scanId: datasetId }), false));
            roisForScansRequests.push(this._roiService.searchROIsAsync(SearchParams.create({ scanId: datasetId }), true));
            scanIds.push(datasetId);
          }
        });

        let imagesForScanReq = this._cachedDataService.getImageList(ImageListReq.create({ scanIds: scanIds }));

        if (quantRequests.length === 0) {
          quantRequests.push(of(null));
        }

        return this._cachedDataService.getScanList(ScanListReq.create()).pipe(
          switchMap(scanList => {
            let scanItems = scanList.scans;

            return combineLatest([...roiRequests, ...quantRequests, ...quantsForScansRequests, ...roisForScansRequests, ...imageRequests, imagesForScanReq]).pipe(
              map(response => {
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

                let productsByDataset: { [datasetId: string]: DatasetProducts } = {};
                Object.entries(scanConfigurations!).forEach(([datasetId, scanConfig]) => {
                  let scanItem = scanItems.find(scan => scan.id === scanConfig.id);
                  if (!scanItem) {
                    return;
                  }

                  let roisForDataset = rois.filter(roi => roi.scanId === datasetId);
                  let quantsForDataset = quants.filter(quant => quant.scanId === datasetId);
                  let imagesForDataset = (
                    imagesInWorkspace.map((image, i) => {
                      let datasetImage = image?.image;
                      if (datasetImage?.imagePath && datasetImage.imagePath !== workspaceImageIds[i]) {
                        console.warn(
                          `Different image returned (Requested: "${workspaceImageIds[i]}", Received: ${datasetImage?.imagePath}). Injecting original ID into new image object...`
                        );
                        datasetImage.imagePath = workspaceImageIds[i];
                      }

                      return datasetImage;
                    }) as ScanImage[]
                  ).filter(image => (image && image.originScanId === datasetId) || image?.associatedScanIds?.includes(datasetId));

                  productsByDataset[datasetId] = {
                    workspaceROIs: roisForDataset,
                    searchableROIs: [...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS],
                    workspaceQuants: quantsForDataset,
                    searchableQuants: [...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS],
                    workspaceImages: imagesForDataset,
                    searchableImages: [...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS],
                    scanItem: scanItem,
                    scanName: this._analysisLayoutService.getScanName(scanItem),
                  };
                });

                roisForScans.forEach((rois, i) => {
                  Object.values(rois).forEach(roi => {
                    productsByDataset[roi.scanId].searchableROIs = productsByDataset[roi.scanId].searchableROIs || [...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS];
                    productsByDataset[roi.scanId].searchableROIs.push({
                      icon: "assets/icons/roi.svg",
                      id: roi.id,
                      name: roi.name,
                    });
                  });
                });

                quantsForScans.forEach((quants, i) => {
                  let scanId = quants[0].scanId;

                  productsByDataset[scanId].searchableQuants = [
                    ...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS,
                    ...quants.map(quant => ({
                      icon: "assets/icons/quant.svg",
                      id: quant.id,
                      name: quant.params?.userParams?.name || quant.id,
                    })),
                  ];
                });

                allImages.forEach((image, i) => {
                  let scanId = image?.originScanId || image?.associatedScanIds?.[0];
                  if (!scanId) {
                    return;
                  }

                  productsByDataset[scanId].searchableImages = productsByDataset[scanId].searchableImages || [...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS];
                  productsByDataset[scanId].searchableImages.push({
                    icon: "assets/icons/image-gray.svg",
                    id: image.imagePath,
                    name: this._analysisLayoutService.getImageName(image),
                  });
                });

                return { workspace, products: productsByDataset };
              })
            );
          })
        );
      })
    );
  }

  replaceScan(
    idReplacements: { [id: string]: string },
    duplicateProducts: { [scanId: string]: DuplicateDatasetProducts },
    searchableROIsForScans: { [scanId: string]: SearchableListItem[] },
    searchableQuantsForScans: { [scanId: string]: SearchableListItem[] },
    searchableImagesForScans: { [scanId: string]: SearchableListItem[] },
    scanId: string,
    newScanId: string
  ): Observable<{
    idReplacements: { [id: string]: string };
    duplicateProducts: { [scanId: string]: DuplicateDatasetProducts };
    searchableROIsForScans: { [scanId: string]: SearchableListItem[] };
    searchableQuantsForScans: { [scanId: string]: SearchableListItem[] };
    searchableImagesForScans: { [scanId: string]: SearchableListItem[] };
  }> {
    idReplacements[scanId] = newScanId;

    duplicateProducts[scanId].accordionOpen =
      (searchableROIsForScans[newScanId]?.length > 0 || searchableQuantsForScans[newScanId]?.length > 0) && newScanId !== "no-replace" && newScanId !== "remove";

    return forkJoin({
      quants: this._analysisLayoutService.fetchQuantsForScanAsync(newScanId),
      imageResp: this._cachedDataService.getImageList(ImageListReq.create({ scanIds: [newScanId] })),
      mistROIs: this._roiService.searchROIsAsync(SearchParams.create({ scanId: newScanId }), true),
      rois: this._roiService.searchROIsAsync(SearchParams.create({ scanId: newScanId }), false),
    }).pipe(
      map(({ quants, imageResp, mistROIs, rois }) => {
        searchableQuantsForScans[newScanId] = [
          ...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS,
          ...quants.map(quant => ({
            icon: "assets/icons/quant.svg",
            id: quant.id,
            name: quant.params?.userParams?.name || quant.id,
          })),
        ];

        if (!duplicateProducts[scanId].accordionOpen && quants.length > 0) {
          duplicateProducts[scanId].accordionOpen = newScanId !== "no-replace" && newScanId !== "remove";
        }

        // Find best guess for replacement
        duplicateProducts[scanId].quants.forEach(existingQuant => {
          let bestGuess = searchableQuantsForScans[newScanId].find(
            quant => quant.name.toLowerCase() === (existingQuant.params?.userParams?.name || "").toLowerCase()
          );

          if (bestGuess) {
            idReplacements[existingQuant.id] = bestGuess.id;
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
              idReplacements[existingQuant.id] = bestNonNameMatch;
            } else {
              // If we can't find a good match, remove the quant. It will be brought back using auto logic on first load
              idReplacements[existingQuant.id] = "remove";
            }
          }
        });

        // Images
        let images = imageResp?.images || [];
        searchableImagesForScans[newScanId] = [
          ...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS,
          ...images.map(image => ({
            icon: "assets/icons/image-gray.svg",
            id: image.imagePath,
            name: this._analysisLayoutService.getImageName(image),
          })),
        ];

        if (!duplicateProducts[scanId].accordionOpen && images.length > 0) {
          duplicateProducts[scanId].accordionOpen = newScanId !== "no-replace" && newScanId !== "remove";
        }

        duplicateProducts[scanId].images.forEach(existingImage => {
          let existingBaseName = this._analysisLayoutService.getImageName(existingImage);
          let bestGuess = searchableImagesForScans[newScanId].find(image => {
            return image.name.toLowerCase() === existingBaseName.toLowerCase();
          });

          if (bestGuess) {
            idReplacements[existingImage.imagePath] = bestGuess.id;
          } else {
            // Check if is _MSA or is _VIS first and then find the respective
            let existingIsMSA = existingBaseName.includes("MSA_");
            if (existingIsMSA) {
              let newMSA = searchableImagesForScans[newScanId].find(image => image.name.includes("MSA_"));
              if (newMSA) {
                idReplacements[existingImage.imagePath] = newMSA.id;
                return;
              }
            } else if (existingBaseName.includes("VIS_")) {
              let newVIS = searchableImagesForScans[newScanId].find(image => image.name.includes("VIS_"));
              if (newVIS) {
                idReplacements[existingImage.imagePath] = newVIS.id;
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

              let imagesWithMatchingExtension = searchableImagesForScans[newScanId].filter(image => image.name.endsWith(existingExtension));
              if (!existingSDS && imagesWithMatchingExtension.length > 0) {
                idReplacements[existingImage.imagePath] = imagesWithMatchingExtension[0].id;
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
                idReplacements[existingImage.imagePath] = bestSDSMatch;
              } else {
                idReplacements[existingImage.imagePath] = "remove";
              }
            }
          }
        });

        // ROIs
        Object.entries(mistROIs).forEach(([id, roi]) => {
          rois[id] = roi;
        });

        searchableROIsForScans[newScanId] = [
          ...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS,
          ...Object.values(rois).map(roi => ({
            icon: "assets/icons/roi.svg",
            id: roi.id,
            name: roi.name,
          })),
        ];

        if (!duplicateProducts[scanId].accordionOpen && Object.keys(rois).length > 0) {
          duplicateProducts[scanId].accordionOpen = newScanId !== "no-replace" && newScanId !== "remove";
        }

        // Find best guess for replacement
        duplicateProducts[scanId].rois.forEach(existingRoi => {
          let bestGuess = searchableROIsForScans[newScanId].find(roi => roi.name.toLowerCase() === existingRoi.name.toLowerCase());

          if (bestGuess) {
            idReplacements[existingRoi.id] = bestGuess.id;
          } else if (existingRoi.isMIST) {
            // If we can't find a perfect match and this is a MIST ROI, remove it
            idReplacements[existingRoi.id] = "remove";
          } else {
            // Match on tags if we can't find an exact name match
            // If we have a single tag match, use that
            // If we have multiple tag matches, use the one with the most similar name

            let roisToSearch = searchableROIsForScans[newScanId];
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
              idReplacements[existingRoi.id] = tagMatchedROIs[0].id;
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
                idReplacements[existingRoi.id] = bestNonExactMatch;
              } else {
                idReplacements[existingRoi.id] = "remove";
              }
            }
          }
        });

        return {
          idReplacements,
          duplicateProducts,
          searchableROIsForScans,
          searchableQuantsForScans,
          searchableImagesForScans,
        };
      })
    );
  }
}
