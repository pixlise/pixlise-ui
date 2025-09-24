## 4.77.0 (LATEST)

### Bug Fixes
- Fixes critical issue where configuration for widgets of the same type were not being separated correctly, causing unexpected control behavior

## 4.76.0 (2025-09-22)

### New Features
- **3D View**: A new widget to view our scans in 3D. **NOTE: This is experimental, be careful drawing any conclusions from this view for now**. It uses the beam location x,y,z coordinates provided by spectrum data to build a terrain-like view of the PMCs and extrapolates out to the corners of the MCC image. Supports a lot of the features the context image does:
  - Shows context image (or other selected image)
  - Shows PMCs, footprint
  - Viewing maps with various options
  - Various draw options/settings/lighting modes. It is hoped users fiddle with it and provide feedback and feature requests to guide the development team to a final working design.
- **Binary Chart Zoom**: Adds zoom functionality to the binary chart.
  - Zoom using sliders or with the scroll wheel. Scroll over an axis to just zoom that axis.
  - Hold down shift to pan the chart.
- **RGBU Plot Zooming** Scroll wheel zooming support was added to the RGBU plot as well.

### Bug Fixes
- Fixes with interactive exporting where RGB mix color scales were showing blank
- Fixes issue where if you clicked the export button once, clicking it again would not open the dialog

## 4.75.0 (2025-09-15)

### New Features
- Clicking on a PMC in an ROI now selects it. Also added keyboard up/down key listeners so we can go through the ROI PMCs one by one. Because they're selected, they show on the spectrum chart!
- Supports importing EM data where the SDF file didn't contain the scan termination tokens - it detects this scenrio by seeing if the scan log has less PMCs than the planned count. Also fixed an unusual case where SDF gv line blocks were not separated by something else so the parser failed when reading the next gv block.

### Bug Fixes
- Fixed UI hanging if binary chart x or y axis was to show negative values.
- Removed some pointless stdout printing that the client library (including Python lib) was writing

## 4.74.0 (2025-09-11)

### Bug Fixes
- Forced rebuild of PIXLISE due to https://news.ycombinator.com/item?id=45169794

## 4.73.0 (2025-09-05)

### New Features
- **Reference Picker**: Adds a reference picker to the binary and ternary charts. This allows you to select a reference from a list of references and apply it to the chart.
  - References can be created and edited by clicking the edit button in the top corner of the simplified picker.
  - References can also be bulk imported from a CSV

### Bug Fixes
- Fixes issue with context image where display value ranges were not being saved correctly for expression groups (like RGB Mix)

## 4.72.0 (2025-08-21)

### New Features
- Exporting spectra using the "Raw Spectral Data per PMC by ROI .csv" now replaces the energy calibration columns (offset and x-per-chan) with the calibration in the auto quant "AutoQuant-PDS (AB)", or the selected quant if the auto-quant doesn't exist. If no quants are selected at all, it will output what we currently output - the calibration that comes with the spectrum data (DataDrive RFS csv or .MSA files).

### Bug Fixes
- Fixed issues with login using newer versions of chrome or private tabs. Login errors are also better presented. We no longer use cookies so it should be more flexible in future.

## 4.71.0 (2025-07-24)

### Bug Fixes
- Fixes issue with Variogram widget where custom expressions were not returning any values
- Hides empty sections in widget picker if no widgets are available
- Fixes issue with quant table where it was breaking workspace layout

## 4.70.0 (2025-06-23)

### New Features
- Updates all widget toolbars to have more consistent theming and layout
- Updates iconography to consolidate space and better represent actions and charts
- Redesigns chart settings menus to be more accessible and always show all options
  - Chart settings menus now also pop up on right click on a widget
- Adds new interactive exporter to the spectrum chart
- Adds new exporter to the histogram widget
- Adds new simple quantification table exporter
- Adds new interactive exporter to the multi-channel viewer

### Bug Fixes
- Fixes bug where sorting by abundance in quantification table wasn't updating the table
- Fixes styling on exporter


## 4.69.0 (2025-06-13)

### Bug Fixes
- Made group list scrollable on groups page
- Fixed issue with sharing workspace that is showing an image with invalid associated scans defined
- Image options window now remembers brightness settings while it's open so if switching between images or ratio vs RGB it should be more user friendly

## 4.68.0 (2025-06-06)

### New Features
- Added readMap() function available in Lua expression language. This allows reading a map that was uploaded from the PIXLISE python client library using the saveMapData() python function. This allows code to be written external to PIXLISE that can access any datasets required to form a map of data, which can now be displayed in PIXLISE. The name of the maps must match (between the one saved in python and the one referenced in the PIXLISE expression language call to readMap) and if displaying on a binary plot you will likely want 2 maps - one for each axis.
  - NOTE: PMCs in this case can just be a number counting up from 0 to however many points are in the map.
  - NOTE2: If using multiple maps together (like in the case of binary map X and Y axis) ensure that the maps are the same size otherwise an error will be shown.
- If a saved map changes and an expression in PIXLISE is using data from that saved map, it will redraw the chart. This allows someone to run code multiple times outside of PIXLISE using the client library and interactively see the chart update to reflect the latest values uploaded to the map.
- If an ROI which is being used on a binary, ternary or histogram is changed, these views will automatically redraw to reflect the change.
- Adds ability for viewers to propogate viewership to other users
  - This makes it so users can share a workspace with other users that contains items they don't have edit access to without having to manually duplicate or request edit access for each item
- **Chart selection picker overhaul**
  - New chart picker that makes chart options more scannable
  - Prevents title overflows
  - Allows customization of chart title and description
  - Chart descriptions support markdown formatting
  - Chart descriptions are shown on tooltip hover and on chart title click if configured
- Added new switch to ROI creation dialog which allows saving one ROI per contiguous cluster of PMCs in the selection. This creates one ROI per cluster of PMCs, and any clusters which have less than 3 PMCs end up in a "residual points" ROI. When deleting one of these ROIs, the user is asked if they want to delete just the one clicked on or all the ROIs created with this feature. This allows easy clean-up of the ROIs created.

### Bug Fixes
- Dataset tiles page now correctly shows item count when datasets filtered by tags
- Fixes bug with user icon in share dialog
- Adds better accessibility metadata labels to share dialog and expression layer
- Removed incorrectly calculated dataset count column on manage groups dialog (where users can ask to join a group)

## 4.67.0 (2025-05-14)

### New Features
- Shows locked icon on groups page for non-joinable groups
- Show user ID on Add User dialog and group management page to allow lookup/identification in Auth0
- Adds dynamic tick marks to spectrum chart y axis for log scaling 
- Updates "Add Role" dialog to include role descriptions
- Adds default roles option to group management page
  - Admins can now set default roles that users will get when they are added to a group as a member
- Adds descriptive label for image upload on dataset customisation page and filters alignable image options to MCC images

### Bug Fixes
- Fixed issue on spectrum chart where selection was still showing up after being cleared 
- Adds better error handling to image uploading in dataset customisation page
- Disables image alignment controls for non-aligned images
- Fixes quantification table bug where data for All Points ROI was not being displayed correctly

## 4.66.0 (2025-04-25)

### New Features
- Shows spinner in expression console on code editor page when expression is running
  - Adds skeleton state for code editor widget so this doesn't show before the expression is loaded
- Group management page overhaul
  - Admins can now directly add/remove Auth0 roles from users from within Pixlise
  - Adds group metadata edit dialog
  - Buttons, wording, and dialogs have been adjusted to better explain what's happening depending on user account permissions

### Bug Fixes
- Fixes performance issues on code editor page when switching expressions (max call stack exceeded)
- Updates code editor time out options to match config options
- Styling enhancements to expression console (fixes copy button position, overflow states, etc.)
- Standardizes user icons across the groups page, reduces redundant requests
- Fixes issue where for some users, the All Points ROI wasn't changing color when changed from the datasets sidebar (browser caching issue)
- Misc performance improvements (reduces redundant requests for ROIs, etc.)

## 4.65.0 (2025-04-10)

### New Features
- Added text box entry for specifying opacity of context image layer visibility
- Server-side clears cached expression output if it hasn't been accessed for over 30 days
- Brought back expression editor contextual help, and updated it to show help for newer functions like readCache/writeCache/exists, constants scanId/quantId/userId and available values for things like housekeeping/data/element functions.

### Bug Fixes
- Saves MIST ROI Reproducibility setting for context image
- If white background is selected in export options and a custom color isn't set for the AllPoints ROIs, the binary and ternary charts will now switch All Points to a dark color
- Fixing image beam location exports for non-FM datasets, particularly fixes PIXL-EM cal target imports
- Exporting scans which have spectrum fields missing such as XPERCHAN/OFFSET no longer fails
- Exporter side-bar tab no longer requires quant to be selected to enable ticking checkboxes for items that don't rely on quant selection

## 4.64.0 (2025-04-01)

- Adds interactive exporter for Binary Plots, Ternary Plots, and Context Images
  - Standard controls for font size, color, border widths, dimensions, etc.
- Adds key to Context Image
- Adds show MIST ROI Reproducibility to Context Image
- Dataset tiles page now allows viewing the list of all update times for the selected dataset
- Local expression cache is only used for a limited now, then retrieved from server
- Spectrum calibration set to default values for PIXL EM imports

### Bug Fixes
- Fixed issue with export dialog not showing correct data
- Cache saving/loading of expressions is now done via HTTP so we shouldn't be limited by max message size of web socket. More meta data is also saved to assist searching/clearing it
  - NOTE: This release will effectively "clear" the locally cached expression data and start retrieving it from the server again until local caching builds up again.

## 4.63.0 (2025-03-19)

### New Features
- Dataset tiles page now shows Join Groups button up to for users who are only in one group
- Group Admin page now sorts groups on left pane
- PIXL EM imports now detect the word cal-target, cal_target or caltarget (case insensitively) and supply the "-t" flag to beam geometry tool to ensure cal target EM scans are generated correctly

### Bug Fixes
- Fixed histogram error displayed when it had no expressions specified (happens while PIXLISE workspace is loading).

## 4.62.0 (2025-03-10)

### New Features
- Dataset browsing now remembers the instrument filter you set until you reload the page

### Bug Fixes
- Fixed PIXL EM importer default image setting - was using an invalid path and failing
- Image upload alignment was having issues when setting the offset x/y values
- Clicking on a diffraction list item in the sidebar wasn't zooming the spectrum onto that diffraction peak
- Dates displayed related to workspaces now show month in MMM text format to disambiguate date format
- When no scans are configured, image picking on the context image showed weird behaviour. This is now fixed and a warning is displayed to remind user to configure scans.

## 4.61.0 (2025-03-05)

### New Features
- Expression Cache Controls
  - Minor feature that allows you to clear your local and remote cache for any given expression in your workspace from expression layer 3-dots menu
  - Can also delete all cached versions of an exression from the "Metadata" dialog in the code editor
- Code Editor Expression Exporting
  - Added a new export button to the code editor console, which allows you to export the current output as a CSV
- Histogram selection display now updates as selection changes
- Separate zoom and whiskers display modes added for histogram
- Hovering over PMCs from multiple scans on the same image now works, scan name is displayed at bottom-right with PMC number
- PIXL EM importer now sets a default image and a unique RTT aka Dataset ID each time it runs to prevent overwriting the same one if RTT is not changed

## 4.60.0 (2025-02-03)

### New Features
- Optimised request sending to have an outgoing queue, and we only send a configurable amount of requests at a time. This also allows us to prioritise messages, eg spectrum requests can be last, we want other widgets to get working sooner on load.
- When selecting dataset tiles, the right side summary now shows some info about ownership of the dataset, along with a sharing button
- While PIXLISE is waiting on responses to requests from the server it now shows a loading animation in the top toolbar. Mouse hovering over it explains what it's waiting for. This should help clarify what PIXLISE is doing when loading larger datasets.
- Adds new entry point for browsing and creating expressions and modules in the code editor
  - Replaces empty expression with new create buttons
  - Adds "New" menu button in the top left Explorer panel

### Bug Fixes
- Fixed issues with setting uploaded image match transforms to non-integer values, sometimes mongo DB was failing to convert a float64 to float32 precision and bombed out
- Small fixes to dataset customisation page, with better error handling
- Image picker now works correctly when there are no images (previously it was showing errors)
- Import dialog now tails the log for longer, and tries to detect end of log messages to stop refreshing
- Fixed issue where last used expression loses modules when user switches tab and then switches back to the code editor
- Popup (bottom-left) "snack" style error messages weren't showing the HTTP error text correctly
- Fixes issue where dataset replacement for earlier downlinked context images wasn't working correctly

## 4.59.0 (2025-01-14)

### New Features
- Added instrument filter on dataset tiles page. If nothing selected, all datasets shown, but can filter down to just what's selected.

### Bug Fixes
- Various small bug fixes that were detected by our error logging system. Seemingly people have had times when they hovered over a PMC with missing data and maybe they saw an error dialog even though it's a valid situation. Hopefully these are resolved now.

## 4.58.0 (2025-01-10)

### Bug Fixes
- Order beam location versions from latest to oldest on dropdown

## 4.57.0 (2025-01-10)

### New Features
- Reviewer Workspaces: A new workspace type that allows for reviewing datasets. Reviewer workspaces are read-only and have an associated magic link that can be shared and accessed by anyone even without a PIXLISE account. 
  - Reviewer workspaces can be created from the "Workspace" tab in the sidebar under "Review".
  - Only one reviewer workspace can be created per workspace and it can be set to last indefinitely or expire after a set period.
  - NOTE: Datasets included in a reviewer workspace must be shared with the Public group to be accessible by reviewers.
- Confusion around image versions and what beam location versions exist for them has now been resolved:
  - No matter what image you have selected, the latest version of that image will be displayed.
  - Context image's image options dialog now shows a warning if the displayed image is a newer version than the selected one to make it clear (see tooltip).
  - Beam locations are now stored independently of the image version, so you should be able to load beam location version 1, 2 or 3 if it's available for a given image as opposed to previously hunting through all versions of an image.
  - Importer has been updated to save beam locations in the new way too.
- Lua expressions now have access to a new userId field, to assist with caching purposes

## 4.56.0 (2024-12-09)

### Bug Fixes
- Fixed exporter issue where zip file contained empty folders or was missing files. Was due to invalid file names being generated for files in the zip file because they contained things like ROI names (which may have a /, % or > character in them!). Zip file generation now converts file names to be something valid, by replacing the bad characters with a _. The names may not be as expected by the person exporting, but at least their computer won't scoff at the names, and allow viewing exported files!
- PIXLISE data backups for very large files were failing and causing the API to restart. These are now streamed instead of read into memory in one go.
- Fixed issue with importing datasets where in some cases it would try to import multiple sets of files that were uploaded incorrectly and failing to complete.
- Importer now correctly reports free disk space when it starts reading in uploaded files (was reporting 0 bytes).
- EM importer wasn't able to read EM data correctly in cases where it differed significantly from FM SDF Peek output. It seems a different version of SDF Peek is used, so importer had to be updated to be more flexible when some rows are written in different formats, RTTs and SCLKs written in different ways, etc. Also ensured EM datasets are imported with the correct detector config applied.
- EM importer failing (returning an error) was causing API to crash due to trying to set owner of the invalid imported scan. 

## 4.55.0 (2024-11-22)

### New Features
- Small scan picker on side-bar dataset configuration panel behaves the same as dataset tiles page when filtering/sorting scans
- Added element set functionality in the Display Fit dialog
- Quantification table now works across multiple scans properly. When we added this functionality to the rest of PIXLISE the quant table wasn't fully implemented. You can now select quants from multiple scans, and separately ROIs from multiple scans. When they overlap, a table will get generated.

### Bug Fixes
- Made element list on Display Fit scroll properly if too many selected to fit
- Small picker dialog (eg when picking quants on quant table) is now scrollable to support case of multiple scans more flexibly

## 4.54.0 (2024-11-20)

### New Features
- Dataset Customisation page now shows spinners while it's doing things because until now it provided little feedback. The layout was changed to be a little more useful, and redundant features like dataset name/description/tag editing were removed (they have been available on the dataset tiles page for several months now). Brightness and Opacity are now displayed as a % and more accurately controllable.

### Bug Fixes
- Fixed context image pan/zoom, in some conditions it caused a division by zero and was written to view state, where it then failed to reload
- Fixed issue when multiple scans are loaded and context images displayed for more than one of those scans - was showing error "Image beam locations not found", but a tab reload worked.
- Dataset Customisation: fixed bug where deleting an uploaded image, and uploading a new one with the same name doesn't clear cache, old image is displayed.
- Dataset Customisation: Fixed issue with brighness slider on image upload, which now allows dimming as well as brightening.
- Removed redundant caching of images downloaded (browser and our own DB were both caching it). This should bring a slight memory usage improvement

## 4.53.0 (2024-11-15)

### Features
- Added ability to upload PIXL EM datasets. Requires zipping up the SDF-Peek output directory (or a subset of files). Click the "Upload" button on the dataset tiles page and you can select the dataset type "pixl-em", enter the RTT of the dataset you're wanting to import (SDF-Peek output may contain data from multiple RTTs, so you have to specify which one you're importing). The upload screen has more instructions too.
- Dataset import pipeline is now optimised, existing datasets are quicker to import because they are not spanned across multiple zip files. We now have a tool we can run to optimise this in future if it gets fragmented.

### Bug Fixes
- Fixed display of test Sol numbers for datasets - year was off by one

## 4.52.0 (2024-11-15)

### Bug Fixes
- Fixed issue when attempting to just change the color order of an existing RGB Mix expression in the expression picker

## 4.51.0 (2024-10-30)

### Features
- Replace dataset from active workspace in dataset config tab under three dots menu
  - This dialog is the same as the Workspace Templating "replace scan" feature, but acts as a shortcut to replace and reload the active workspace

### Bug Fixes
- Fixed issue causing diffraction and roughness data on the side-bar failing to load

## 4.50.0 (2024-10-29)

### Features
- Subtle custom color selection for ROI design improvements

### Bug Fixes
- Exporting context image was still creating some black images at times, should not happen again
- Exporting "large" versions of plots didn't correctly change the DPI to ensure we have high resolution axis/keys/etc. The width/height of small vs large images exported have been adjusted.
- Removed "dark mode" from RGBU export for now because it ended up exporting only a few black spots
- Fixed a spelling mistake

## 4.49.0 (2024-10-10)

### Features
- **Workspace Templating** Allows workspaces to be duplicated and different scans, ROIs, quantifications, and images to be substituted in.
  - This feature is a part of the workspace "Duplicate" workflow and is available as a new toggle
  - When you first substitute a scan, Pixlise will attempt to match existing data to the new scan. If it can't, it will mark the invalid data for removal and it won't be included in the duplicated workspace (this can be overridden if desired by choosing a valid option from the respective dropdown).
    - Matching logic is as follows for the different types of data:
      - **ROIs:** Match first by exact name (case insensitive), then by tags. If there are multiple ROIs that all have the tags in the original ROI, then the best name match is chosen. If no match is still found, then we look again at the name and try to find any that are 1 character different (eg. Olivine vs olivines).
      - **Quantifications:** Match first by exact name (case insensitive). If no exact match, then filter down to all quants that are the same type (A/B or Combined) and then find the quant with the most overlapping elements. If there's a tie, prefer the one with the most similar name.
      - **Images:** Match first by exact name (unlikely to ever match). If no exact match, then first check if it's a known type (MSA or VIS). If not, then filter down to images that have the same file extension (eg. PNG, TIF) and check the SDS fields from the filename (eg. camSpecific, colourFilter, instrument, etc.) and find the image with the most overlapping fields. If there's a tie, prefer the one with the closest count of PMCs.

## 4.48.0 (2024-10-09)

### Features
- Lua expressions now support waiting on calculations by another expression to allow reducing the total amount of calculations on a given workspace tab. This is done through the readCache/writeCache functions, where readCache() takes a 2nd parameter, which if set to true, will wait for anything already calculating to complete. If nothing is calculating, the caller is expected to call writeCache() for that same key to save a value for other expressions to use.
- Brought back Lua function export feature. Exports code/modules along with the data the expression needs. It can be run on your local machine using the lua interpreter. See the README.md file included with an export
- Improved Lua expression execution time by optimising Map library. Runs about 15-20% faster.
- We now run 2 expressions as part of our automated test suite: "SiO2'" and "Diffraction Map (B)". Results are compared to expected outputs.
- Added ability for PIXLISE to display beam location i,j values correctly once data is corrected (they're stored as j,i throughout the pipeline).
- Documented where PIXLISE periodic table and XRF data comes from, in case it needs to be traced/referenced as part of publications

### Bug Fixes
- Fixes "disimprovement" from last release: Exporting of RGBU context image worked, but RGBU channel selection now didn't trigger image re-rendering. This should now work reliably for both cases.

## 4.47.0 (2024-10-02)

### Bug Fixes
- Fixes export of context image being blank when RGBU image is selected

## 4.46.0 (2024-10-02)

### Bug Fixes
- Fixes issue with MIST ROI reproducibility column not being applied correctly to some scans
- Fixes stale ROI list in ROI picker when MIST ROIs are overwritten/replaced from side panel

## 4.45.0 (2024-09-30)

### Features
- Expression Picker now remembers your last opened section
- ROI Picker now remembers your last selected sections
- MIST ROIs can now include a per-PMC confidence value column that affects ROI opacity on context image
- **Custom ROI Colors** Adds support for custom ROI colors via a color picker. Preset colors should still be preferred where possible.
- Expression language (in Lua only) now has 2 new functions: `readCache` and `writeCache` to allow reuse of calculated data between other expressions. Also added new constants: `instrument`, `scanId`, `quantId`, `maxSpectrumChannel` and `elevAngle`. Running expressions is also about 10% faster due to not recomputing the results of `spectrum()` calls when the same channels are requested.
- Removed Back to V3 button

## 4.44.0 (2024-09-27)

### Bug Fixes
- Fixes spectrum export exporting detector A values for detector B

## 4.43.0 (2024-09-26)

### Features
- **Reorderable Workspace Tabs** You can now reorder workspace tabs by dragging and dropping them in the workspace tab list.

### Bug Fixes
- Fixes bug with sharing workspaces that include expression groups
- Allows longer RGB Mix names to be saved

## 4.42.0 (2024-09-18)

### Bug Fixes

- Fixes issue with exporter where if no beam location versions are found for a given image, it failed the entire export
- Fixes an issue with admin accounts viewing the backup/restore features if they're disabled

## 4.41.0 (2024-09-16)

### Features

- **Workspace Snapshot Sharing** Workspaces can now be shared as snapshots. This allows for sharing a workspace with a specific configuration, including all tabs, settings, and data. Snapshots can be shared with other users or saved for later use. Snapshots are read-only and cannot be edited after being created, but can be duplicated.
  - All sub-items (expressions, ROIs, quants, etc.) are (attempted to be) shared on snapshot-share, but if the user doesn't have edit permissions for a sub-item, they will not be able to update its sharing settings and this shows up as a warning. This sharing issue can be resolved either before or after sharing a workspace and workspaces/all sub-items can be "re-shared" later.
- **Workspace Duplicating** Workspaces can now be duplicated. This allows for creating a copy of a workspace with all tabs, settings, and data. Duplicated workspaces can be edited and saved as new workspaces.
- **Default Quant Selection** When creating a new workspace, a default quant is now selected (workspace configuration is also automatically saved on quant change). Default quant selection is made by the following priority hierarchy:
  - AutoQuant PIXL (A/B)
  - AutoQuant PIXL (Combined)
  - AutoQuant PDS (A/B)
  - AutoQuant PDS (Combined)
  - < Any default imported quant >
  - First user-created A/B quant
  - First user-created Combined quant
- **New Workspace Improvements** Clicking the "New Workspace" button now opens a dialog to configure the workspace name, description, tags, and scans before creation. Additionally, holding "Cmd" (or "Ctrl" on Windows) and clicking scans will now add default select them for the new workspace.
- **Workspace Searching Improvements** Workspace search now includes searching by snapshots and creator names. Also, you can click on column names to sort the workspace list. Lastly, your "Workspaces" or "Datasets" selection will be remembered when you navigate back to the workspace list.
- **Backup & Restore** For PIXLISE Devs/Admins to be able to back up all PIXLISE data and restore onto another environment in a more automated way.

### Bug Fixes

- Fixes logout bug when clicked from the public site (redirects to wrong URL)
- Fixes bug when plotting sigma values on Parallel Coordinates Plot with ratio columns showing
- Fixes bug when creating new ROI from the ROI sidepanel instead of the selection dropdown (footprint was being selected)
- Fixed intermittent connection error 18798 when UI was reconnecting to server

## 4.40.0 (2024-09-05)

### Features

- **Exporting beam locations for uploaded images** Images uploaded and "matched" to existing MCC images now also have coordinates exported when ticking the "Beam Locations" option on export tab. We now export one CSV file per image name because we were getting way too many columns in one file.

## 4.38.0 (2024-09-04)

### Features

- **Redesigned Multi-Dataset Parallel Coordinates Plot** Parallel Coordinates plot now works with multiple datasets, picking up images from the ROI or defaulting to the MSA image in the case of All Points. Also allows toggling between mean/median, different sigma levels, and excluding zeros.
- **Duplicate Workspace Tab** Allows for duplicating a workspace tab, including all settings and configurations, from the workspace tab on the sidebar.
- **Select Nearby Pixels** Feature is back on the Selection (left) side-bar. If you click it, pixels in the RGBU MSA image get selected. If you're currently not viewing this on the context image, it still happens and switching the context image to the RGBU MSA image will display the selection.
- **User Permissions applied to UI** In UI elements that allow quantification creation, viewing quant job list or ROI editing, we consistantly now show the feature as disabled if user has no permissions.

### Bug Fixes

- Multi-Quant side-bar display issues
- Importer lambda now prints out what triggered it first thing in case we need to re-run it. Also gets auto-deployed now
- Spectrum chart Display Fit feature is now more robust, and shows "spinners" when fit is being loaded or generated
- Made PIQUANT map/fit options clearer for different user account permissions

## 4.37.0 (2024-08-20)

### Features

- More "spinners" shown while PIXLISE is loading/logging in/waiting for downloads to help usability - previously it was often just stuck as a blank/unresponsive page or similar.
- You can now "Open in new tab" on the browse page (by selecting a dataset tile, then using the drop-down arrow OR holding CTRL (Windows) or CMD (Mac) while clicking "Open").
- Exporting beam locations now exports ALL beam location versions. They're all in the same CSV so there may be a lot of columns. Eg 3 images, 3 versions each, i/j columns = 18 columns
- New "Text View" widget created, so you can annotate what's in a workspace by strategically placing text views. They support "Markdown" notation so you can create headings, lists, bold/italic text, etc.

### Bug Fixes

- Image options (for context image) was not correctly showing the currently displayed beam location version.
- Context image visibility wasn't showing show/hide setting of image correctly
- More robust login/re-authentication, login errors are now shown more clearly too, especially useful for new users with unverified emails
- Spectrum export CSV didn't contain PMCs in first table
- Fixed several issues that were causing context images to be black at times.
- Fixed issues where ROIs loaded with a workspace had no "id" field

## 4.34.0 (2024-08-15)

### Features
- Adds new "2x4 Context Images" and "2x4 Context Images/PCP" workspace tab templates
- Persists "link to dataset" option for the context image
- Image Picker now sorts based on image type, and displays image names/properties more readibly
- Loading spinners shown on image options/image picker when required
- Beam location version is selectable even for "matched" images now including RGBU images

### Bug Fixes
- Fixes authentication issue that was causing login token failures in Chrome incognito mode and on the Brave browser (changes token storage to local storage).
- Fixes minor bug with the chart keys where clicking on the expand/collapse accordion would also toggle group visibility.
- Fixes bug where some image configuration options weren't being saved to the context image
- Fixes rare image loading bug where images may be black or may not redraw straight after load

## 4.33.0 (2024-08-09)

### Bug Fixes
- Small fix for the beam geometry version selector - it wasn't showing the currently rendered version initially, but now it should be accurate.

## 4.32.0 (2024-08-08)

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