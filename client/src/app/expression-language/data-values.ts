// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { MinMax } from "src/app/models/BasicTypes";
import { DataExpression } from "../generated-protos/expressions";
import { ROIItem } from "../generated-protos/roi";
import { RegionSettings } from "../modules/roi/models/roi-region";

export class PMCDataValue {
  // This is a single value for a PMC. Initially it was just a number, however with multi-quant
  // we ended up needing "undefined" values because that element simply has no value quantified.
  // After some consultation it seems we still want to treat these as 0 in the case of calculations
  // because if we add 2 maps together where one has some undefined values in it, we want the new
  // map to only contain the other value.
  //
  // Initially wanted to use JS undefined, but undefined+12==undefined.
  //
  // Thought of defining a "special" undefined value but that means any math done will have to check
  // for this.
  //
  // Finally, it seems a separate isUndefined flag is the easiest way to go. When element() reads it,
  // some values may have this set to true, but after arithmatic it will become false.
  //
  // Also this way if something displaying the data wants to treat them as 0's it doesn't need
  // modification, but if it wants to treat them otherwise it has a separate variable to look at.
  // isUndefined defaults to false because we rarely actually want to create an undefined value!
  constructor(
    public pmc: number,
    public value: number,
    public isUndefined: boolean = false,
    public label: string = ""
  ) {
    // If the value comes in as undefined, set it to 0, warn if this is not so
    if (this.isUndefined && this.value != 0) {
      console.warn("PMC: " + pmc + " is undefined, but value is: " + this.value);
      this.value = 0;
    }
  }
}

export enum QuantOp {
  MIN,
  MAX,
  UNDER,
  OVER,
  AVG,
  ADD,
  SUBTRACT,
  MULTIPLY,
  DIVIDE,
  // Same as UNDER but set the 0 value to undefined
  UNDER_UNDEFINED,
  // Same as OVER but set the 0 value to undefined
  OVER_UNDEFINED,
}

export class DataQueryResult {
  constructor(
    public resultValues: PMCDataValues | any, // PMCDataValues if the query was for PMC data, otherwise it's whatever the query returned
    public isPMCTable: boolean,
    public dataRequired: string[],
    public runtimeMs: number,
    public stdout: string,
    public stderr: string,
    public recordedExpressionInputs: Map<string, PMCDataValues>,
    public errorMsg: string = "",
    public expression: DataExpression | null = null,
    public region: RegionSettings | null = null
  ) {}

  public static get DataTypeSpectrum() {
    return "spectrum";
  }
  public static get DataTypeHousekeeping() {
    return "housekeeping";
  }
  public static get DataTypeDiffraction() {
    return "diffraction";
  }
  public static get DataTypeRoughness() {
    return "roughness";
  }
  public static get DataTypePosition() {
    return "position";
  }
}

export class PMCDataValues {
  private _valueRange: MinMax = new MinMax();
  public values: PMCDataValue[] = [];
  public isBinary: boolean = false;
  public warning: string = "";

  static makeWithValues(values: PMCDataValue[]) {
    const result = new PMCDataValues();
    result.setValues(values);
    return result;
  }

  static makeWithValuesMinMax(values: PMCDataValue[], range: MinMax, isBinary: boolean) {
    const result = new PMCDataValues();
    result._valueRange = range;
    result.values = values;
    result.isBinary = isBinary;
    return result;
  }

  static filterToCommonPMCsOnly(values: (PMCDataValues | null | undefined)[]): (PMCDataValues | null)[] {
    const result: (PMCDataValues | null)[] = [];
    if (values.length === 0) {
      return result;
    }

    // Find all the PMCs which they have in common
    let overlappingPMCs = new Set<number>();
    for (const vals of values) {
      if (!vals) {
        continue;
      }

      const currentPMCs = new Set(vals.values.map(value => value.pmc));
      if (overlappingPMCs.size === 0) {
        overlappingPMCs = currentPMCs;
      } else {
        overlappingPMCs = new Set([...overlappingPMCs].filter(existingPMC => currentPMCs.has(existingPMC)));
      }

      if (overlappingPMCs.size === 0) {
        break;
      }
    }

    // Filter results to only include overlapping PMCs
    return values.map(vals => {
      if (!vals) {
        return null;
      }

      const filteredValues = vals.values.filter(value => overlappingPMCs.has(value.pmc));
      return PMCDataValues.makeWithValues(filteredValues);
    });
  }

  addValue(v: PMCDataValue) {
    if (!v.isUndefined) {
      this._valueRange.expand(v.value);
    }
    this.values.push(v);

    if (v.value != 0 && v.value != 1) {
      this.isBinary = false;
    }
  }

  private setValues(values: PMCDataValue[]) {
    if (values && values.length) {
      this.values = values;
      this._valueRange = new MinMax();
      this.isBinary = true; // if we see anything that's not 0 or 1, we mark this as false

      for (const item of values) {
        if (!item.isUndefined) {
          this._valueRange.expand(item.value);
        }

        if (item.value != 0 && item.value != 1) {
          this.isBinary = false;
        }
      }

      if (this._valueRange.getRange() == 0) {
        // It's not actually binary...
        this.isBinary = false;
      }
    }
  }

  get valueRange(): MinMax {
    return this._valueRange;
  }

  public normalize(): PMCDataValues {
    const result = new PMCDataValues();

    for (let c = 0; c < this.values.length; c++) {
      let newValue: PMCDataValue | null = null;
      if (this.values[c].isUndefined) {
        newValue = new PMCDataValue(this.values[c].pmc, 0, true);
      } else {
        newValue = new PMCDataValue(this.values[c].pmc, this._valueRange.getAsPercentageOfRange(this.values[c].value, false));
      }
      result.values.push(newValue);
    }

    // by definition...
    result._valueRange = new MinMax(0, 1);

    return result;
  }

  public threshold(compare: number, threshold: number): PMCDataValues {
    const result = new PMCDataValues();

    for (let c = 0; c < this.values.length; c++) {
      let towrite = 0;
      if (!this.values[c].isUndefined && Math.abs(this.values[c].value - compare) < threshold) {
        towrite = 1;
      }

      result.values.push(new PMCDataValue(this.values[c].pmc, towrite, this.values[c].isUndefined));
    }

    // by definition...
    result._valueRange = new MinMax(0, 1);
    result.isBinary = true;

    return result;
  }

  // For example, Math.pow taking in 2 args, returning 1
  // Executes this for each value in map (second param comes from arg)
  public mathFuncWithArg(theMathFunc: (a1: number, a2: number) => number, arg: number): PMCDataValues {
    const result = new PMCDataValues();

    for (let c = 0; c < this.values.length; c++) {
      let towrite = theMathFunc(this.values[c].value, arg);
      if (this.values[c].isUndefined) {
        towrite = 0;
      }
      result.values.push(new PMCDataValue(this.values[c].pmc, towrite, this.values[c].isUndefined));
    }

    result._valueRange = new MinMax(
      theMathFunc(this._valueRange.min == null ? 0 : this._valueRange.min, arg),
      theMathFunc(this._valueRange.max == null ? 0 : this._valueRange.max, arg)
    );

    result.isBinary = false;
    return result;
  }

  // For example, Math.sin taking in map value as arg
  // Executes this for each value in map
  public mathFunc(theMathFunc: (num: number) => number): PMCDataValues {
    const result = new PMCDataValues();
    result.isBinary = true; // pre-set for detection in addValue

    for (let c = 0; c < this.values.length; c++) {
      let towrite = theMathFunc(this.values[c].value);
      if (this.values[c].isUndefined) {
        towrite = 0;
      }

      result.addValue(new PMCDataValue(this.values[c].pmc, towrite, this.values[c].isUndefined));
    }

    /* This was failing for some trig functions... seemed like min vs max were backwards?!
        result._valueRange = new MinMax(
            mathFunc(this._valueRange.min),
            mathFunc(this._valueRange.max)
        );
        result.isBinary = false;

        return result;
*/
    return result;
  }

  public operationWithScalar(operation: QuantOp, scalar: number, scalarIsLeft: boolean): PMCDataValues {
    // We allow these with a scalar:
    const scalarOps = [
      QuantOp.ADD,
      QuantOp.SUBTRACT,
      QuantOp.MIN,
      QuantOp.MAX,
      QuantOp.UNDER,
      QuantOp.OVER,
      QuantOp.MULTIPLY,
      QuantOp.DIVIDE,
      QuantOp.UNDER_UNDEFINED,
      QuantOp.OVER_UNDEFINED,
    ];

    if (scalarOps.indexOf(operation) == -1) {
      throw new Error("operationWithScalar only supports: " + scalarOps);
    }

    const result = new PMCDataValues();

    for (let c = 0; c < this.values.length; c++) {
      let val = 0;
      let undef = false;

      switch (operation) {
        case QuantOp.ADD:
          val = scalar + this.values[c].value;
          break;
        case QuantOp.SUBTRACT:
          if (scalarIsLeft) {
            val = scalar - this.values[c].value;
          } else {
            val = this.values[c].value - scalar;
          }
          break;
        case QuantOp.UNDER:
          val = this.values[c].value < scalar ? 1 : 0;
          break;
        case QuantOp.OVER:
          val = this.values[c].value > scalar ? 1 : 0;
          break;
        case QuantOp.UNDER_UNDEFINED:
          val = this.values[c].value < scalar ? 1 : 0;
          if (val == 0) {
            undef = true;
          }
          break;
        case QuantOp.OVER_UNDEFINED:
          val = this.values[c].value > scalar ? 1 : 0;
          if (val == 0) {
            undef = true;
          }
          break;
        case QuantOp.MIN:
          val = Math.min(this.values[c].value, scalar);
          break;
        case QuantOp.MAX:
          val = Math.max(this.values[c].value, scalar);
          break;
        case QuantOp.MULTIPLY:
          val = scalar * this.values[c].value;
          break;
        case QuantOp.DIVIDE:
          if (scalarIsLeft) {
            val = scalar / this.values[c].value;
          } else {
            val = this.values[c].value / scalar;
          }
          break;
      }
      /*
            This seemed like a good idea, but we decided against it. 2*element() ended up with undefined
            values where they were read as undefined, but 2+element() had no undefined values because they
            had changed. This way it's clearer.

            // Undefined values are treated as 0's in map operations so we expect them to become
            // "defined", however if they evaluate to 0 afterward, we keep the undefined flag
            if(this.values[c].isUndefined && val == 0)
            {
                undef = true;
            }
*/
      // If we actually created an undefined value, eg division by 0 here, we also set
      // the undefined flag
      if (val === null || isNaN(val)) {
        val = 0;
        undef = true;
      }

      // Set binary flag once
      switch (operation) {
        case QuantOp.OVER:
        case QuantOp.UNDER:
          result.isBinary = true;
          break;
      }

      result.values.push(new PMCDataValue(this.values[c].pmc, val, undef));
      if (!undef) {
        result._valueRange.expand(val);
      }
    }

    return result;
  }

  // Note if you want to do one-another:
  // one.operationWithMap(SUBTRACT, another);
  public operationWithMap(operation: QuantOp, map: PMCDataValues): PMCDataValues {
    // Define this so this.values is A, and map.values is B, so we can rebuild if needed
    let A = this.values;
    let B = map.values;
    let warning = "";

    if (A.length != B.length) {
      // Now in the multi-quant world, this is a valid scenario - user may have quantified an ROI with an element that wasn't
      // quantified on any other PMCs, so if an expression deals with these 2 columns, we will have a different number of PMCs
      // in each map. Instead of all-out failing we can take the intersection of PMCs between the 2 sets and try to work it out
      const intersectionPMCValues = PMCDataValues.filterToCommonPMCsOnly([this, map]);
      if (intersectionPMCValues[0] != null) {
        A = intersectionPMCValues[0].values;
      }
      if (intersectionPMCValues[1] != null) {
        B = intersectionPMCValues[1].values;
      }

      // We only really care if the 2 inputs were of different lengths!
      //if(A.length != this.values.length || B.length != map.values.length)
      if (this.values.length != map.values.length) {
        warning = "Operation combining 2 sets of values had mismatched PMCs, some PMCS missing from result";
      }
    }

    const result = new PMCDataValues();
    result.warning = warning;

    for (let c = 0; c < A.length; c++) {
      let val = 0;
      let undef = false;

      switch (operation) {
        case QuantOp.MIN:
          val = Math.min(A[c].value, B[c].value);
          break;
        case QuantOp.MAX:
          val = Math.max(A[c].value, B[c].value);
          break;
        case QuantOp.AVG:
          val = (A[c].value + B[c].value) / 2;
          break;
        case QuantOp.ADD:
          val = A[c].value + B[c].value;
          break;
        case QuantOp.SUBTRACT:
          val = A[c].value - B[c].value;
          break;
        case QuantOp.MULTIPLY:
          val = A[c].value * B[c].value;
          break;
        case QuantOp.DIVIDE:
          val = A[c].value / B[c].value;
          break;
        default:
          throw new Error("operationWithMap unexpected operation: " + operation);
          break;
      }

      // If we actually created an undefined value, eg division by 0 here, we also set
      // the undefined flag
      if (val === null || isNaN(val)) {
        val = 0;
        undef = true;
      }

      result.values.push(new PMCDataValue(A[c].pmc, val, undef));
      if (!undef) {
        result._valueRange.expand(val);
      }
    }

    return result;
  }
}
