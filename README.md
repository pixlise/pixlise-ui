# PIXLISE

[![DOI](https://zenodo.org/badge/519266678.svg)](https://zenodo.org/badge/latestdoi/519266678)

## Data Visualisation for Mars 2020 Rover Project

### What's here?
* `/auth0` contains auth0 extensions
* `/client` contains source code of angular client that runs as a webpage
* `/data-formats` git sub-module for data-formats repository should check out to here

### Setting up for PIXLISE UI development
- Pull down git sub-modules:
Make sure you have the git submodules inited - pixlise now contains data-formats as a submodule. Once you have done a git clone of the pixlise repository, you will need to run:
```
git submodule init
git submodule update
```
- Set up Auth0 account (www.auth0.com)
- Set up the Auth0 account as per ./auth0/auth0-setup.md
- Set `auth0_domain`, `auth0_client` in `./client/src/environments/environments.ts`
- Set `auth0_audience` to Auth0 backend Audience in auth0_audience in `./client/src/environments/environments.ts`
- Set `unassignedNewUserRoleId` to Auth0 Role ID for "Unassigned New User" in `./client/src/environments/environments.ts`
- Run npm i (NOTE: This has a post-install step (`./client/src/version.js`) which generates `./client/src/environments/version.ts`)
- Run `./genproto.sh` to generate protobuf serialisation files (reads from `data-formats` sub-module, outputs to `./client/src/app/protolibs`. If missing protobuf code generator, install it, see https://github.com/protocolbuffers/protobuf)
- Run ng serve
- Navigate browser to http://localhost:4200
