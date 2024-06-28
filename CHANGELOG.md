## 4.24.0 (Unreleased)

### Bug Fixes

- Show spinners on Quant Jobs tab when a quant is running. Also show user icons for quant creator.

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