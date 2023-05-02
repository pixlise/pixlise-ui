# PIXLISE Widgets

We refer to the various data visualisation panels in PIXLISE as widgets. Initially they were written separately in an experimental fashion with differing underlying implementations, some used Chart.js, others D3, some custom canvases. They have since been refactored and converted to share a common architecture based on a general purpose component called [InteractiveCanvas](interactive-canvas.md), whose source code can be found here: https://github.com/pixlise/pixlise-ui/blob/main/client/src/app/UI/atoms/interactive-canvas. Please look at the documentation for `InteractiveCanvas` as a starting point as it will make understanding the widgets easier since they will refer to classes like `CanvasInteractionHandler`, `CanvasDrawer` etc which are concepts defined in `InteractiveCanvas`.

Some widgets are more complex with stateful "tools" (eg Context Image or Spectrum Chart pan/zoom/lasso tools) that the user can select and UI elements that the user can interact with (which are always visible, such as the physical scale on the Context Image). The intent is to push common code into `InteractiveCanvas` and write it in a way that makes it generic and usable in other classes. Particularly the tools/UI elements are new and have yet to be standardised in this way.

Another important point about all widgets - they store their view state (anything the user configures on the widget, such as expressions, ROIs, showing/hiding layers, etc) via the `ViewStateService`. Each widget has its own view state structure, and the widget can save the view state just for itself as needed. When a dataset is opened, the view state is automatically requested and when it arrives, contains the view state of all saved widgets. Each widget subscribes for this event and apply its view state when this happens.


## Context Image
![Context image](imgs/context-image.png)

Source code root: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/context-image-view-widget

### About

This widget is all about visualising the spatial distribution of data from the experiment over the context image obtained by the instrument. Data can be the location of spectra that were read (see PMC in [terminology](pixlise/back-end/terminology.md)), or the quantified data synthesized from the spectra (in the form of element maps, etc). Users are also given the ability to select locations and form regions of interest (ROIs), with the ability to visualise these.

This widget is built from multiple components which have to interact with the same underlying model, so there is a `services/context-image.service.ts` service injected into these components so they all have access to the same model, and can subscribe to changes in the model.

### Various forms of context image

The context image appears on multiple main tabs/routes in the UI. They act slightly differently, and this is controlled by the `@Input mode` of the `ContextImageViewWidgetComponent`. This mainly controls what Drawer class to use for drawing the Context Image (https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/context-image-view-widget/drawers), and also controls availability of various tools/UI elements. In the Map tab, the context image is linked to other views which show the element maps that are enabled in the Display settings under the context image. These are implemented by the class `MapViewComponent` in https://github.com/pixlise/pixlise-ui/blob/main/client/src/app/UI/context-image-view-widget/map-view/map-view.component.ts.

### Tools

Source code: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/context-image-view-widget/tools

These are the tools visible on the bottom toolbar of the context image widget. One tool is always selected, the user is able to change between them. They are also able to "spring" activate a tool using a keyboard shortcut while another tool is active (eg press Shift to pan while in the lasso tool). This interaction is controlled by `ContextImageToolHost`, which is also the `CanvasInteractionHandler` for the `InteractiveCanvas`. The ToolHost routes keyboard/mouse events to the selected tool, and also has a `getDrawers()` function that returns a list of drawers that allows each tool to present interactive elements for the user.

### UI Elements

Source code: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/context-image-view-widget/ui-elements

These are elements which the user can interact with, and they are always drawn over the context image. They can be dragged around within the context image viewport, and also have interactive parts that can be dragged to change for example the colour range of the `MapColourScale`. They must be derived from `BaseUIElement` and implement the `CanvasInteractionHandler` and `CanvasDrawer` interfaces.

### Layers

![Layers](imgs/context-image-layers.png)

Layers of information can be drawn over the context image. These originate from data to be visualised at each PMC location, which are turned into "element maps", that is shaded/coloured rectangles that are hopefully touching and forming a continuous surface where the experiment locations are. The colour of the rectangles can be controlled by the `MapColourScale` UI element, and also the colour ramp assigned to the layer. Layers can be turned on/off and their opacity changed.

There is a lot of state information associated with layers, and this is all stored as part of the view state of the context image. This task of weaving together the list of quantifications, the view state, and notifying UI components (via subscriptions) of changes is handled by `LayerManager` and the above layer control list is defined by `LayerControlComponent` in https://github.com/pixlise/pixlise-ui/blob/main/client/src/app/UI/context-image-view-widget/layer-control/layer-control.component.ts

Layer maps are drawn by the `LocationDataLayer` class which stores the layer information, and this is initiated by the active Drawer (see `MainContextImageLayeredDrawer` class).

### Regions

Regions of interest (ROIs) are groups of experiment locations (PMCs). These act similarly to Layers in that there is a `RegionManager` https://github.com/pixlise/pixlise-ui/blob/main/client/src/app/UI/context-image-view-widget/region-manager.ts which coordinates the view state (visible/opacity) of regions along with keeping track of the ROIs themselves (from `ROIService`) and notifies UI components via subscriptions. The list of regions is available as a tab on the side-bar: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/side-panel/tabs/roi

Regions are drawn as polygons (with holes in them) by the `RegionLayerInfo` class, and this is initiated by the active Drawer (see `MainContextImageLayeredDrawer` class).

The polygons drawn are stored as the `RegionDisplayPolygon` class which contains the x/y `Point` objects for each vertex of the polygon. Holes are handled by storing an array of hole polygons in the `RegionDisplayPolygon`. When rendered, these are drawn in by calling `CanvasRenderingContext2D.beginPath()` once, then `closePath()` is called after each polygon is drawn (first the polygon itself, then its hole polygons), finally `fill()` does the job correctly and draws with holes taken into account.

Polygon generation is done in `RegionManager`, though it may be useful to move this into a utility class if required in other areas of PIXLISE. See function `makePolysForCoords`. The process for generating region polygons is:
- Gather the points (x/y coordinates) for the required Location Indexes (see [terminology](pixlise/back-end/terminology.md)). Triangulating just using the actual PMC x/y coordinate would fail in the case of an individual point or two neighbouring points, because these do not form triangles. To add some "thickness" to the triangles, we actually generate 8 points around each PMC x/y coordinate, and use these.
- Trinagulate the "thicker" x/y coordinates (using `delaunator` npm package). Because this forms filled convex triangle meshes, we need to process it further...
- We remove triangles which span between areas (user may have circled 2 groups of PMCs far from each other, we dont need any triangles spanning between them). This is done by removing triangles that have an edge longer than the element map rect size (plus some tolerance). When a triangle is removed, we have to be careful to update the half-edge structure generated by `delaunator`.
- Using the half-edge structure, we find all "outer" edges (edges that have only one triangle attached), and store these in a map by edge start idx->edge end idx.
- We build polygons (as lists of indexes into the x/y coord array we started with), by following the chain of outer edge lookups
- We then store polygons as lists of x/y coordinates, but as we do this we check all other polygons, to see if they are contained within the current polygon. This way we find the hole polygons, and store them correctly in `RegionDisplayPolygon`. Any polygons which are not holes within another, are just stored as regular polygons that don't have a hole.

### Quantifications

TODO: Write this section - it's designed but not yet coded at time of writing!

### Context Image Toolbar

This is made up of the various zoom control buttons at the top of the context image (`ContextImageToolbarComponent`). It is in its own Component because it can be inserted in the title bar of a `PanelComponent` when creating the context image.

## Spectrum Chart
![Spectrum chart](imgs/spectrum.png)

Source code root: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/spectrum-chart-widget

### About

Initially the spectrum chart was based on Chart.js which functioned relatively well, but due to the custom nature of the items we draw, it became too complicated to maintain plugins for Chart.js, which work quite differently to the rest of our code, so it was rewritten to be based on `InteractiveCanvas`.

This implementation shares some similarity with the Context Image in that they are the most complicated widgets.

Both have a `ToolHost` class (in this case called `SpectrumChartToolHost`, tools, and UIElements. Another similarity is there is a `SpectrumChartService` which allows the other components to configure/view/subscribe to the same spectrum chart model.

### Tools

Tools here at time of writing are Pan, Zoom and Range Selection. Pan/Zoom are self-explanatory.
`RangeSelect`, when enabled, shows 2 dragable bars on either end of the spectrum, allowing users to select a start/end energy level. UI presented is as a "snack" - which the tool listens for button presses using `SnackService`. When pressed, this generates a new expression for the energy levels. As the expression language operates on channels, the tool does the conversion between the selected energy and the channels for the expression. This is a one-time operation, if the energy calibration changes, the tool would need to be re-run to generate a new expression.

### UI Elements

Several chart functionalities are implemented as UI elements:
- **Annotations** This draws the currently active list of annotation flags that apply to the spectrum chart. User can point to an annotation to see the text associated with it
- **Chart XRF lines** When the user selects XRF lines to draw (using the Peak Identification panel), this is what draws them to the screen. Interactive with mouse cursor, shows tooltips for line pointed to along with associated lines.
- **Mouse cursor** As cursor moves, we show a vertical line to align with the X axis. Also if a user points at a line, this cursor does the mouse point collision detection with the line and draws a tooltip showing the value at the mouse.
- **XRF browser** Draws a user-movable vertical bar allowing selection of a current energy level, and behind this (faded out) it draws XRF lines near the energy level. This is used in conjunction with the Peak Identification "Browse on chart" tab. Keeps the table on the tab in sync as the user drags the bar, adjusting the scroll position/refilling the table as needed.
- **Zoom map** Draws the rectangular area showing the spectrum and a box showing what the user is currently zoomed into. The box changes aspect ratio since the spectrum chart can be zoomed independently in X and Y axes.

### Peak Identification

This panel is shown under the spectrum chart if "Peak ID" button is pressed. It contains all peak identification UI elements. These interact with the UI Elements of the chart to show user-interactive lines/cursors etc. Tabs are:

- **Annotations** List of annotations for the current chart. These show as flags on the spectrum chart (drawn by the Annotation UIElement). These are a simple data structure with a text description, energy level (for X positioning), and the assoicated ROI ID. They are managed by the `AnnotationService`. User is able to add/delete/share/edit the annotations.
![Annotations Tab](imgs/annotation-tab.png)

- **Element Sets** List of element sets that can be applied to the current spectrum view. These are basically just a list of elements saved by the user with a name. They can be shared between users and applied to the view, replacing any elements the user has chosen. These are managed by the `ElementSetService`.
![Element Sets Tab](imgs/element-sets-tab.png)

- **Browse On Chart** Scrollable table of XRF lines. Interacts with XRF Browser UI Element which draws the XRF lines near user-movable vertical bar marking the currently searched energy level. The list stays in sync with the UI Element.

XRF Lines are looked up using `PeriodicTableDB` (source code: https://github.com/pixlise/pixlise-ui/blob/main/client/src/app/periodic-table/periodic-table-db.ts, [description here](periodic-table.md)) which loads a raw list of XRF lines (K, L, M and escape lines) for each element/energy level, and combines these to reduce the amount of noise for spectorscopist users.

It uses a custom algorithm for the combining of the lines designed by Mike Tice on the Science team.

![Browse On Chart Tab](imgs/browse-on-chart-tab.png)

- **Periodic Table** User-selectable periodic table of elements. This allows users to hover over elements and see their corresponding XRF lines on the chart (drawing done by the `ChartXRFLines` UI Element which listens to events from the periodic table). The tab actually contains a `PeriodicTableComponent` which was built to be general purpose, but eventually was replaced by `ExpressionPickerComponent` as we had to restrict the list of selectable elements on other widgets to the ones that are available as expressions. This means this tab is the only user of the periodic table.

Users can click once on an item to add it to a list of selected elements (turns orange). If users click again (either on periodic table or a tick at the main line pin head on the chart), the element is added as a confirmed element and the line turns purple, and draws the main line (with others faded).

- **Selected XRF Lines** List of user-selected XRF lines, which can be done on either of the tabs: Browse on chart, Periodic Table or Element Sets. Users can delete elements here, or show/hide K/L/M/Escape lines and toggle visibility. The model for these lines is `XRFLineGroup` allowing flags to enable the line types.

There are buttons at the top of the panel:
- **Clear** To clear the selected elements
- **Save Element Set** User can save the elements as a new element set
- **Quantify** The most important button! This allows uers to create a new quantification. See [quantification](quantification.md)

### Energy Calibration

Allows user to configure energy calibration for the spectrum chart. Users can disable the calibration (in which case Spectrum chart shows X axis in units of channels - spectra are loaded from experiment files with 4096 values read from the detectors). `SpectrumEnergyCalibrationComponent` dialog class presents the choices.

The calibration involves specifying a eV start and eV per channel value for both the A and B detectors. Users can specify custom values or load them from either the current quantification or the current dataset.

This interacts with `SpectrumChartService` to set the calibration.

### Drawer

`SpectrumChartDrawer` is responsible for drawing the charts, and is used by the underlying `InteractiveCanvas`. This draws the axes and the spectrum lines, and also calls on the `SpectrumChartToolHost` to draw anything else as required by Tools and UI Elements.

Unline the context image, applying a transformation to zoom everything would not work (line thicknesses change when zoomed), so drawing is done in screen space (see `drawChart()`) with the positions of anything drawn that is affected by the spectrum chart pan/zoom settings transformed as it's drawn. The transformation is done by the axis responsible (an x/y coordinate in the spectrum line is transformed by the X and Y axes, as the axis knows what the pan/zoom setting is for that component of the coordinate system.

Since the intent is to draw more kinds of charts with this same code, the `ChartAxis` code lives with the `InteractiveCanvas` class and is generic. See [Interactive Canvas](interactive-canvas.md), especially information about the `ChartAxis` class.

## Chord Diagram
![Chord diagram](imgs/chord.png)

Source code root: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/chord-view-widget

Chord diagrams are based on `InteractiveCanvas` and therefore define a `ChordDiagramInteraction` and `ChordDiagramDrawer` class which is passed to the `InteractiveCanvas`. Users are able to specify a list of expressions to be shown at each node in the diagram, along with the choice of a Region (ROI) (using the `ROIPickerComponent` dialog) to display the data for.

On opening a new dataset, when a chord diagram doesn't have a astored view state, it will pick what it can to show. If there are only pseudointensities, it will pick the first 10 (at time of writing, see `setStartingExpressions()`. If a quantification is loaded, it will show the first 10 of these.

`ChordViewModel` stores the raw state of the widget, including the label, expression ID, value, error value and chords. `ChordViewNode` wraps the raw data with draw data such as the coordinate of the node.

`ChordViewWidgetComponent.recalcCorrelationData()` is called to recalculate the model data for any major event, such as a dataset loading, selection change, etc. To generate the chord values `ChordViewWidgetComponent.makeModel()`:
- Each nodes expression is evaluated (`ChordViewWidgetComponent.getData()`) for the value and the error (if availabe). Error data doesn't exist for pseudo-intensities so this is skipped. To determine what the expression refers to (quant or pseudo-intensity data) `getPredefinedQuantExpressionElement` is run, and if it returns an element, we're querying quantification data and an expression to query the error is formed and evaluated.
- The values are summed, along with error * value (if error was read)
- Error (if was read) is then divided by the sum of the values, to get a relative error
- The values, value sum, relative error are stored in a lookup with the key being the expression ID
- All value sums are also summed up
- All expression IDs are looped through, and compared to all others (except themself!). `getPearsonCorrelation()` calculates the pearson correlation of the values for the 2 nodes, and returns a value that is stored as the chord value between those nodes.

When the chord diagram is next drawn in `ChordDiagramDrawer.drawScreenSpace()`, `calcDisplayData()` is called. This then calculates the coordinates of each node for drawing/mouse interaction. The coordinates are simply points formed at equal arcs along a circle formed within the bounds of the widget rectangle, with some padding.

Drawing the chord diagram is done as expected, by looping through the nodes and drawing them with a bar indicating the concentration value, and the error forming a 0-100% arc along the boundary of the node. Chords for each node are looped through and drawn (subject to the draw mode -/Both/+ correlations) and threshold slider value.

The label drawn in the middle of a node formed by `DataExpressionService.getExpressionShortDisplayName()` as either:
- The element symbol (if it's a case of a simple query of an element from the quantification file)
- Greek psi-Element if it's a pseudo-element
- If it's a complex expression, the first element query is found and f(Element) shown as the node name
- If all else fails, it's the expression ID (which would probably be far too big for the node and look wonky)


## Binary Plot
![Binary plot](imgs/binary.png)

Source code root: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/binary-plot-widget

Binary plots are also based on `InteractiveCanvas` and therefore define a `BinaryInteraction` and `BinaryDiagramDrawer` class which is passed to the `InteractiveCanvas`. Users are able to specify an expression for the X and Y axis (by clicking on the axis label area or button provided), which brings up the `ExpressionPickerComponent` dialog. When an expression is selected for each axis, and ROIs selected (several can be selected, limited by the number of colours ROIs can be set to), the expressions are executed and we end up with 2 `QuantifiedDataValues` arrays containing the PMCs requested and their corresponding value.

Users are able to click on the Regions button to display the `ROIPickerComponent` dialog, which allows the selection of one expression (for the axis clicked) along with a colour to display for that ROI.

Each axis has a `BinaryPlotAxisData` class to descrbe its label, the array of `QuantifiedDataValues` for that axis (one per ROI), along with a min/max value for the axis's range. These sit in a `BinaryPlotData` class along with a list of colours for each ROI.

When the user changes an expression, selects ROIs, or edits ROI colours, or a view state is loaded (soon after startup), or dataset/quantification changes, `BinaryDrawModel.regenerate()` is called to rebuild the displayed model data. This does not at that point know the length of the text labels on each axis, so a large rectangle is calculated for them, in practice it will be drawn within the middle of the rect. Mouse interaction code can safely check for the mouse being within the rect, it will be a larger area than the label and axis swap button.

All the drawing code can be found in the `BinaryDiagramDrawer` class, and all drawing is done in canvas space.


## Ternary Plot
![Ternary plot](imgs/ternary.png)

Source code root: https://github.com/pixlise/pixlise-ui/tree/main/client/src/app/UI/ternary-plot-widget

Ternary plots and binary plots originally were combined into one widget, so their structure is quite similar. Rather than documenting it again, this section focuses just on the coordinate generation of the ternary plot and how it is drawn.

`TernaryData` contains all the data drawn on a ternary diagram. It contains corner information (label, min/max value), and a list of `TernaryDataColour` structures, one per coloured point group drawn.

`TernaryDataColour` contains the colour to draw for that group, along with an array of `TernaryDataItem` data points.

`TernaryDataItem` is the most low-level data point, which contains the PMC associated with the data point (useful when user selects the point), along with the a, b and c values (corresponding to data/expression in the triangle corners).

`TernaryModel` contains the raw data (`TernaryData`), along with the `TernaryDrawModel` which is regenerated when anything changes (see `recalcDisplayData`).

`TernaryDrawModel.regenerate()` calculates all draw model information like positions of the triangle vertexes, and labels (so mouse event handling code in `TernaryInteraction` knows where the user is clicking). Once data is obtained as a `QuantifiedDataValues` by executing the expression for each a/b/c triangle vertex (and ROI/colour), the an x/y position is calculated for the point to be drawn on the triangle. This is calculated according to https://en.wikipedia.org/wiki/Ternary_plot. This is then converted to canvas-space by flipping Y (since Canvas has 0,0 at the top-left) and adding the required padding to sit within the triangle draw coordinates.