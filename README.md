# PIXLISE

[![DOI](https://zenodo.org/badge/519266678.svg)](https://zenodo.org/badge/latestdoi/519266678)

## Data Visualisation for Mars 2020 Rover Project

### What is it?

PIXLISE is an XRF spectroscopy visualisation tool built for the science team behind the PIXL instrument on the NASA Perseverance rover launched to Mars in 2020. It has been released as open source and is intended to be used for many other spectroscopy applications. This repository implements the user interface of the web app. It talks to the API found in the core repository here: https://github.com/pixlise/core

PIXLISE is deployed to https://www.pixlise.org

### What's here?
* `/.github/workflows` contains github workflows (actions) for build and deployment and trello integration
* `/auth0` contains auth0 extensions
* `/client` contains source code of angular client that runs as a single page web app
* `/data-formats` git sub-module for data-formats repository should check out to here

### Related repositories

https://github.com/pixlise/periodic-table-gen contains the code generator for rawPeriodicTable.ts - in case it ever changes... not likely.

### Setting up for PIXLISE UI development
- Pull down git sub-modules:
Make sure you have the git submodules inited - pixlise now contains data-formats as a submodule. Once you have done a git clone of the pixlise repository, you will need to run:
```
git submodule init
git submodule update
```
- Set up Auth0 account (www.auth0.com)
- Set up the Auth0 account as per ./auth0/auth0-setup.md
- For local development, ensure you have a `./client/src/local-development-pixlise-config.json` file with the appropriate fields set. See `./client/src/local-development-pixlise-config-template.json` for what fields there are. You will need set the values:
  - `auth0_domain`
  - `auth0_client`
  - `auth0_audience` to Auth0 backend Audience
  - `unassignedNewUserRoleId` to Auth0 Role ID for "Unassigned New User"
  - *NOTE:* Other fields potentially need to be set, for example if you're debugging with sentry, the DSN for sentry, etc.
- Run npm i (NOTE: This has a post-install step (`./client/src/version.js`) which generates `./client/src/environments/version.ts`)
- Run `./genproto.sh` to generate protobuf serialisation files (reads from `data-formats` sub-module, outputs to `./client/src/app/protolibs`. If missing protobuf code generator, install it, see https://github.com/protocolbuffers/protobuf)
- Run ng serve
- Navigate browser to http://localhost:4200

You should see PIXLISE open to the about page. If this does not happen, check that you do have the configuration json file present (environment.ts references it, if you use a prod build, it may be looking for `pixlise-config.json` instead).
