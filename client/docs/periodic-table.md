# Periodic Table DB

Implemented in `PeriodicTableDB`, this class is what supplies PIXLISE with all information about elemental physics.

Source code: https://github.com/pixlise/pixlise-ui/blob/development/client/src/app/periodic-table/periodic-table-db.ts

- It supplies the periodic table of elements, allows lookups for atomic number vs element symbol
- Listens for the `DetectorConfig` (passed in from `EnvConfigurationService`)
- Combines data from several sources: `rawPeriodicTable.ts`, `element-line-calc.ts`, and uses the detector config
- Also supplies XRF lines for each element, with lines that are closer than the detector resolution being combined
- Calculates escape lines for all XRF lines
- Stores a "common" list of XRF lines to look for
