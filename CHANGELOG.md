## 4.32.0 Latest

### Features

- **Spectrum Range Selection** Brings back spectrum range selection and provides the ability to immediately display on a chart or copy the expression to the clipboard. Range Selection supports immediately applying to any Context Image, Binary Plot, or Ternary Plot on your active workspace tab.
- **Better Loading Indicators** All charts will now display loading spinners when data is initially being fetched, and the chart will be disabled until the data is ready.
- **Expression Groups Export Option** Adds the ability to export expressions using expression groups.

### Bug Fixes

- Spectrum chart was drawing lines before calibration data was fully loaded on initial page load in some cases when multiple datasets were configured due to a race condition. This has been fixed and lines should now be drawn correctly and the X axis should be consistent based on whether "Show Energy on X Axis" is toggled on.
- Fixes issue where charts were initially being loaded with "default" values and then loaded again with the correct values, causing a flicker effect in some cases and increased loading time.
- Minor CSS fixes to dataset details sidebar
- Fixes bug where old expressions and ROI lists weren't being cleared in their respective component after "Clear" was hit on export tab.


## 4.31.0 (2024-08-05)

### Bug Fixes

- Beam location version picker is also shown if there is only one version available, to show what version is being displayed
- Tags are now displayed in alphabetical order (to see the creator, point to it!). Added confirmation for deletion too.

## 4.30.0 (2024-08-05)

### Features

- **User signup changes** New users are automatically added to Public group. Choices of groups to join are now also clearer
- **Notification improvements** Notifications now show a time stamp, and are now dismissable. You may see many unread notifications, feel free to dismiss all just this once!
- **Beam location version selectable** Context image picker dialog now allows picking a beam location version. NOTE: if you refresh the page it will go back to the default one.
- **Smart Chart Keys** Keys in the chart are now more dynamic and allow for quick toggling on/off of ROIs.
  - New Hotkey: `Option/Alt + Click` on a key (or group header) to toggle all other keys (or groups) off and solo the item (click again to toggle back on).
    - Adds hotkey to "Hotkeys" menu in top right.
  - ROIs are also now grouped by dataset, making it easier to find the ROI you're looking for.
  - New "Expand" button that expands all groups and makes the key wider to fit all labels for easier screenshoting and usability on larger displays.
  - Smart Chart Keys are available on: Binary, Ternary, RGBU Plot, Spectrum Chart, Histogram, Parallel Coordinates Plot, and Variogram.

### Bug Fixes

- Clicking a chord on the chord diagram wasn't showing those 2 expressions on binary charts - this functionality has now been restored
- Fixed bug where RGBU Plot wasn't persisting the state of configured ROIs
- Fixes edge case bug where "Apply & Close" on context image sometimes would apply changes and hide button, but not close the dialog
- Fixes data synchronization issues where new expressions and expression groups weren't showing up in the expression picker until reload
- Hides points and footprint from ontext images on element maps page
- Fixed error shown to new users when requesting to join groups
- Fixed caching issue seen during recent downlinks

## 4.29.0 (2024-07-25)

### Bug Fixes

- Save and load context image layer opacity, and visibility dialog kept in sync too
- Added unquantified weight % and chisq back to Quantified Elements section in expression picker
- Fixed image uploader where large image uploads were causing disconnections
- Image uploader brightness slider now works
- All widgets have draw speed improvements due to more agressive caching
- Context image RGBU ratio images were sometimes applying a scale (ake brightness) when they shouldn't have
- Spectrum calibration wasn't able to load from quant

## 4.28.0 (2024-07-18)

### Bug Fixes

- Fixed issue where key wasn't showing up for all datasets if multiple All Points regions were selected
- The region color changer in the ROI picker now updates the dataset color if you change the color for the All Points region
  - Hides the shapes picker for All Points as this is unsupported
- Fixed edge case where if you held down "Cmd" (or "Ctrl" on Windows) and then clicked off the page, when you went back, pressing "B" would trigger the sidebar to toggle
- Expression group can now contain up to 30 expressions
- Context image drawing fixes:
  - Regions drawn on top of layers
  - Layer draw order matches visibility dialog
  - Layer points/footprint now works with scan ids that have "-" in them and initial state is shown correctly

## 4.27.0 (2024-07-16)

### Bug Fixes

- Fixed issues with visibility window on context image
- Fixed expression picker not behaving right when using expression groups/RGB mixes
- Made error messages geerated by expressions more human-readable

## 4.26.0 (2024-07-15)

### Features

- **Workspace Features** Adds ability to expand workspaces past a single tab.
  - Tab name, description, and tags are now editable from the workspace sidepanel
  - Workspace tabs can be hidden and deleted
  - New workspace tab that allows for different tab layouts
- **New Workspace Listing Page** Allows for easier viewing of existing workspaces and creation of new ones.
  - Shows metadata for each workspace

## 4.25.0 (2024-07-15)

### Features

- Context image Visibility window now remembers if you hid a layer, so if you open it again, it's still there

### Bug Fixes

- Quant Job tab updates to show spinners, user icons and errors if they happen.
- Fixed issue where scan doesn't show up in dataset sidebar tab when scan is opened from tiles screen.
- Spectra are downloaded in small batches now to help with disconnection issues.
- Exporter now exports a per-ROI bulk and max value MSA file, along with the AllPoints bulk+max MSA file.
- Clearing selection is now persisted.

## 4.23.0 (2024-06-27)

### Bug Fixes

- Fixed issue with scan colour setting.
- Added more logging to help diagnose issues with downlinks

## 4.22.0 (2024-06-27)

### Features

- **Dataset Editing** Adds the ability to edit dataset metadata, including name, description, and tags from the dataset listing page.
  - Shows a markdown preview of the description field.
- **Chart Dataset Colour Support** Adds support for custom colours for dataset all points in the charts. This feature has existed under the scan configuration tab for a while, but was not previously supported by all charts.
- **Quant Tracker is back!** It can now be found as a tab in the "Run PIQUANT" screen (where you view the periodic table). Look for the "Quant Jobs" tab. It shows the state of quants you're running and allows viewing or downloading the logs (all PIQUANT logs in one zip file!). You can also view the raw PIQUANT CSV output, and set the quant as the one used in your workspace.
- **Image Picker shows PMCs** So for uploading images to PIXLISE, you can now see the PMC associated with an image when picking which one you're "matching" your image to.
- **Beam location versioning improved** PIXLISE had the ability to store multiple version of beam locations already but some updates will now make it work correctly should we run a Beam Geometry Tool v3. V1 beam locations will now be able to be imported into PIXLISE and we'll provide a UI setting to allow switching between them in the next release.

### Bug Fixes

- Variogram custom expression responses were being treated as invalid due to another recent bug fix. This has been resolved.
- Fixes bug where variogram doesn't automatically live update when built-in comparison expressions are switched between.
- Shows warning when selecting quantified elements tab in expression picker when no quantification is configured.
- Quantified Elements are now shown in atomic number order on the expression picker dialog
- Made date/time displays a bit more uniform across the application

## 4.21.0 (2024-06-12)

### Features

- **Change Log** Introduced a new changelog to display differences between versions.
- **Version Checking** PIXLISE now checks for the released version and shows a notification if the current version running in your browser is not the latest (requiring a page refresh)
- **Colour remapping range** Allows colour mapping ranges to be manually set past max bounds from dataset for cross-dataset comparisons.
- **Multi-Quantification** Multi-quantification has been brought back in the side-bar
  - Quantification table widget now doubles as the "ROI Quant Table" from v3 - it can be configured with multiple quants and ROIs, and shows the same list of elements on all tables allowing comparison between quantifications
- **Workspaces** Introduces new "Workspace" tab that allows you to customize the name, description, and tags of your workspace.
  - The description field supports markdown for rich text formatting.

### Bug Fixes

- Fixes bug exporting beam locations for matched images
- Fixes bug where tag count wasn't properly showing by items
- Auto-quantifications are now auto-shared with the same group that sees data from the default PIXL-FM pipeline
- Fixed issue where datasets which don't contain XRF spectra (like Garde) weren't able to be viewed
- Fixed issue with viewing data from multi-quants (and sum-then-quantify quants) where instead of viewing them as "Combined" they came up as detector "C"

## 4.20.0 (2024-05-29)

### Features

- **Variogram Tool:** Enhanced caching for smoother operation.
- **Improved Logging:** Enhanced logging to better diagnose PIXLISE errors.

### Bug Fixes

- **Selection Persistence:** Fixed issue where selections would disappear upon tab refresh.
- **Bulk Spectra:** Resolved a rare issue where bulk spectra were loaded and then forgotten.
- **Minor Fixes:** Addressed various small usability and performance issues.

## 4.13.0 (2024-05-23)

### Features

- **Variogram Tool:** Reintroduced the variogram tool with support for custom expressions.
  - **Note:** Custom expressions can significantly slow down the process due to data transfer between Lua and the tool. However, we have optimized built-in comparison expressions (Subtract and XOR-Sum) for live updates during parameter changes. This enhancement allows for more efficient exploratory analysis.
  - **Examples Provided:** Two example custom expressions have been shared:
    - *Variogram Subtract Comparison* (custom comparison algorithm)
    - *Variogram Custom Element* (custom element type)

- **Local Caching:** Added local caching for spectral data in the browser, significantly speeding up the reopening of previously downloaded scans.
  
- **Auto Quantifications:** Enabled running the four "auto" quantifications on datasets via the dataset edit page, allowing for standardized quantification on historical datasets.

### Bug Fixes

- **Downlink Notifications:** Resolved an issue where "New Dataset arrived" emails were sent for updates to existing datasets.
  
- **Auto-Quantifications:** Fixed auto-quantification errors for "Old Faithful Geyser" caused by incorrect parameters (e.g., oxide elements instead of expected elements).
  
- **Quant Deletion:** Fixed a bug affecting the deletion of quantifications.


View the [full changelog](https://github.com/pixlise/pixlise-ui/releases) for more details.