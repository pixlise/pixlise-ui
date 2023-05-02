# Interactive Canvas

## Overview

This is a generic building block of all widgets in PIXLISE. Early on several experimental widgets had to solve similar problems and it was clear a generic solution which can be tested once should be employed.

This class provides a platform for building UI widgets which draw to a canvas and allow responding to user keyboard/mouse events to manipulate what's in the canvas. This encapsulates several features:

## Mouse/Keyboard events

TODO: document `CanvasInteractionHandler`, `CanvasMouseEvent`, `CanvasKeyEvent`, `CanvasMouseEventId` and `CanvasInteractionResult`
Also mention how this allows tracking of events outside of the canvas draw area (eg dragging)

## Drawing to the canvas

TODO: document `CanvasDrawer` interface and `CanvasDrawNotifier`

## Canvas parameters

TODO: document `CanvasParams` and `CanvasWorldTransform`

## Handling canvas resizing

TODO: document mechanism for detecting window resize and how it notifies canvases

## Chart Axis

The intent is to provide base functionality to multiple kinds of widgets, and one we expect to draw often is charts. This requires a class to handle the drawing of an axis, with tick marks, a label, etc. User zooming/panning is also required, and may be separately done by each axis, so this functionality (and the ability to transform coordinates between data and canvas space) is included. The reason for this is we need different axis types and each may draw/transform coordinates differently. There is an abstract base `ChartAxis` class, but users must use one of `LinearChartAxis` and `LogarithmicChartAxis`. The only difference is how they calculate the transformation of values to canvas space and back, but both respond to the same mouse events and draw the axis the same way.