## 4.21.0 (unreleased)

### Features

- Introduced a new changelog to display differences between versions.

### Bug Fixes

- Fixes bug exporting beam locations for matched images

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