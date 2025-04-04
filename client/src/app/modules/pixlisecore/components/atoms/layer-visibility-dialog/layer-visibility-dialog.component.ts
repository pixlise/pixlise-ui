import { CdkDrag, CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { Component, ElementRef, EventEmitter, Inject, OnInit, Output, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { DataExpressionId } from "../../../../../expression-language/expression-id";
import { ExpressionsService } from "../../../../expressions/services/expressions.service";
import { combineLatest, Subscription } from "rxjs";
import { ColourRamp, Colours } from "../../../../../utils/colours";
import { ExpressionGroup, ExpressionGroupItem } from "../../../../../generated-protos/expression-group";
import { AnalysisLayoutService } from "../../../../analysis/analysis.module";
import { SliderValue } from "../slider/slider.component";
import { SnackbarService } from "../../../pixlisecore.module";
import { ActionButtonComponent } from "../buttons/action-button/action-button.component";

export class LayerVisiblilityData {
  sections: LayerVisibilitySection[] = [];
}

export type LayerVisibilitySection = {
  id: string;
  title: string;
  icon?: string;
  scanId?: string;
  scanName?: string;
  scanColor?: string;
  isOpen: boolean;
  isVisible: boolean;

  options: LayerVisibilityOption[];
};

export type LayerVisibilityOption = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  scanId?: string;
  gradient?: ColourRamp;
  rgbMixId?: number;
  opacity: number;
  showOpacity?: boolean;
  visible: boolean;
  isVisibilityLocked?: boolean;
  canDelete?: boolean;

  isSubMenuOpen?: boolean;
  subOptions?: LayerVisibilityOption[];
};

export type LayerVisibilityChange = {
  sectionId: string;
  layerId?: string;
  subLayerId?: string;
  visible: boolean;
  index?: number;
};

export type LayerOpacityChange = {
  layer: LayerVisibilityOption;
  opacity: number;
};

@Component({
  selector: "layer-visibility-dialog",
  templateUrl: "./layer-visibility-dialog.component.html",
  styleUrls: ["./layer-visibility-dialog.component.scss"],
})
export class LayerVisibilityDialogComponent implements OnInit {
  private _subs: Subscription = new Subscription();
  @Output() selectionChanged = new EventEmitter();
  @Output() visibilityToggle = new EventEmitter<LayerVisibilityChange>();
  @Output() opacityChange = new EventEmitter<LayerOpacityChange>();
  @Output() onReorder = new EventEmitter<LayerVisibilitySection[]>();

  sections: LayerVisibilitySection[] = [];

  private expressionGroups: Record<string, ExpressionGroup> = {};

  layerOpacityInput: string = "";
  showOpacityInputFor: LayerVisibilityOption | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LayerVisiblilityData,
    public dialogRef: MatDialogRef<LayerVisibilityDialogComponent, void>,
    private _analysisLayoutService: AnalysisLayoutService,
    private _expressionsService: ExpressionsService,
    private _snackBar: SnackbarService
  ) {
    this.sections = data.sections;
  }

  ngOnInit() {
    this.sections.forEach(section => {
      section.options.forEach(option => {
        if (!option.subOptions && DataExpressionId.isExpressionGroupId(option.id)) {
          this.loadExpressionGroupLayer(option);
        }
      });
    });

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfig => {
        Object.entries(screenConfig.scanConfigurations).forEach(([scanId, scanConfig]) => {
          this.sections.forEach(section => {
            if (section.scanId === scanId) {
              section.scanColor = scanConfig.colour;
            }

            section.options.forEach(option => {
              if (option.scanId === scanId) {
                option.color = scanConfig.colour;
              }

              if (option.subOptions && option.subOptions.length > 0) {
                option.subOptions.forEach(subOption => {
                  if (subOption.scanId === scanId) {
                    subOption.color = scanConfig.colour;
                  }
                });
              }
            });
          });
        });
      })
    );
  }

  loadExpressionGroupLayer(option: LayerVisibilityOption) {
    this._expressionsService.getExpressionGroup(option.id).subscribe(group => {
      if (!group) {
        return;
      }

      this.expressionGroups[option.id] = group;
      option.name = group?.name || option.name;

      option.icon = "assets/button-icons/rgbmix.svg";

      let ids = group?.groupItems.map(item => item.expressionId) || [];
      combineLatest(ids.map(id => this._expressionsService.fetchCachedExpression(id))).subscribe(expressions => {
        option.subOptions = [];
        expressions.forEach((expression, i) => {
          if (expression.expression) {
            option.subOptions!.push({
              id: expression.expression.id,
              name: expression.expression.name,
              icon: this.getRGBMixIcon(i),
              opacity: 1,
              isVisibilityLocked: true,
              visible: true,
            });
          }
        });
      });
    });
  }

  getRGBMixIcon(i: number) {
    let rgbMixIcons = ["assets/button-icons/rgbmix-red.svg", "assets/button-icons/rgbmix-green.svg", "assets/button-icons/rgbmix-blue.svg"];
    if (i < rgbMixIcons.length) {
      return rgbMixIcons[i];
    } else {
      return "";
    }
  }

  getRGBMixColorRamp(i: number) {
    let rgbMixColours = [ColourRamp.SHADE_MONO_FULL_RED, ColourRamp.SHADE_MONO_FULL_GREEN, ColourRamp.SHADE_MONO_FULL_BLUE];
    if (i < rgbMixColours.length) {
      let rgbMixColorMin = Colours.sampleColourRamp(rgbMixColours[i], 0);
      let rgbMixColorMax = Colours.sampleColourRamp(rgbMixColours[i], 1);
      return `linear-gradient(90deg, ${rgbMixColorMin.asString()}, ${rgbMixColorMax.asString()})`;
    } else {
      return "";
    }
  }

  onChangeLayerOpacity(layer: LayerVisibilityOption, opacity: SliderValue) {
    layer.opacity = opacity.value;
    if (opacity.finish) {
      this.opacityChange.emit({ layer, opacity: opacity.value });
    }
  }

  onEnterOpacity(layer: LayerVisibilityOption, opStr: string) {
    if (opStr) {
      let op = Number.parseInt(opStr, 10);
      if (op !== undefined && op >= 0 && op <= 100) {
        op *= 0.01; // Convert to percentage
        layer.opacity = op;
        this.opacityChange.emit({ layer, opacity: op });
      } else {
        this._snackBar.openError("Invalid opacity entered. Enter a number between 0 and 100!");
      }
    }

    this.layerOpacityInput = "";
    this.showOpacityInputFor = null;
  }

  onEditOpacity(layer: LayerVisibilityOption) {
    this.layerOpacityInput = `${Math.floor(layer.opacity * 100)}`;
    this.showOpacityInputFor = layer;
  }

  onCancelOpacityEdit() {
    this.layerOpacityInput = "";
    this.showOpacityInputFor = null;
  }

  toggleSection(section: LayerVisibilitySection) {
    section.isVisible = !section.isVisible;
    if (section.options) {
      section.options.forEach((option, i) => {
        const origOptionVis = option.visible;
        option.visible = section.isVisible;
        if (origOptionVis !== section.isVisible && (!option.subOptions || DataExpressionId.isExpressionGroupId(option.id))) {
          this.visibilityToggle.emit({
            sectionId: section.id,
            layerId: option.id,
            visible: option.visible,
            index: i,
          });
        } else if (option.subOptions) {
          option.subOptions.forEach(subOption => {
            if (subOption.visible !== section.isVisible) {
              subOption.visible = section.isVisible;
              this.visibilityToggle.emit({
                sectionId: section.id,
                layerId: option.id,
                subLayerId: subOption.id,
                visible: subOption.visible,
              });
            }
          });
        }
      });
    } else {
      this.visibilityToggle.emit({
        sectionId: section.id,
        visible: section.isVisible,
      });
    }
  }

  onLayerOptionsClick(option: string, section: LayerVisibilitySection, layer: LayerVisibilityOption) {
    if (option === "Delete") {
      this.visibilityToggle.emit({
        sectionId: section.id,
        layerId: layer.id,
        visible: false,
      });

      section.options = section.options.filter(opt => opt.id !== layer.id);
    }
  }

  onLayerVisibilityChanged(section: LayerVisibilitySection, layer: LayerVisibilityOption, visible: boolean) {
    if (layer.subOptions) {
      layer.subOptions.forEach(subLayer => {
        subLayer.visible = visible;
        this.visibilityToggle.emit({
          sectionId: section.id,
          layerId: layer.id,
          subLayerId: subLayer.id,
          visible: subLayer.visible,
        });
      });

      if (layer.opacity !== undefined && layer.opacity !== 1) {
        this.opacityChange.emit({ layer, opacity: layer.opacity });
      }

      if (layer.subOptions.some(option => option.visible)) {
        layer.visible = true;
      } else if (layer.subOptions.every(option => !option.visible)) {
        layer.visible = false;
      }
    } else {
      layer.visible = visible;
      this.visibilityToggle.emit({
        sectionId: section.id,
        layerId: layer.id,
        visible: layer.visible,
      });
    }
    if (section.options.some(option => option.visible)) {
      section.isVisible = true;
    } else if (section.options.every(option => !option.visible)) {
      section.isVisible = false;
    }
  }

  onSubLayerVisibilityChanged(section: LayerVisibilitySection, layer: LayerVisibilityOption, subLayer: LayerVisibilityOption, visible: boolean) {
    subLayer.visible = visible;
    this.visibilityToggle.emit({
      sectionId: section.id,
      layerId: layer.id,
      subLayerId: subLayer.id,
      visible: subLayer.visible,
    });

    if (layer.opacity !== undefined && layer.opacity !== 1) {
      this.opacityChange.emit({ layer, opacity: layer.opacity });
    }

    if (layer.subOptions && layer.subOptions.some(option => option.visible)) {
      layer.visible = true;
    } else if (layer.subOptions && layer.subOptions.every(option => !option.visible)) {
      layer.visible = false;
    }
    if (section.options.some(option => option.visible)) {
      section.isVisible = true;
    } else if (section.options.every(option => !option.visible)) {
      section.isVisible = false;
    }
  }

  onClose() {
    this.dialogRef.close();
  }

  dropLayer(section: LayerVisibilitySection, event: CdkDragDrop<LayerVisibilityOption>) {
    moveItemInArray(section.options, event.previousIndex, event.currentIndex);
    this.onReorder.emit(this.sections);
  }

  dropSubLayer(layer: LayerVisibilityOption, event: CdkDragDrop<LayerVisibilityOption>) {
    moveItemInArray(layer.subOptions || [], event.previousIndex, event.currentIndex);
    if (DataExpressionId.isExpressionGroupId(layer.id)) {
      let loadedGroup = this.expressionGroups[layer.id];
      loadedGroup.owner = undefined;

      // Rearrange groupItems to match the new order
      let newGroupItems: ExpressionGroupItem[] = [];
      layer.subOptions!.forEach((subOption, i) => {
        let groupItem = loadedGroup.groupItems.find(item => item.expressionId === subOption.id);
        if (groupItem) {
          newGroupItems.push(groupItem);

          // Update colouring
          subOption.icon = this.getRGBMixIcon(i);
        }
      });

      loadedGroup.groupItems = newGroupItems;

      this._expressionsService.writeExpressionGroup(loadedGroup);
    }
    this.onReorder.emit(this.sections);
  }
}
