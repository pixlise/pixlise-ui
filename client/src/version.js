// Licensed to NASA JPL under one or more contributor
// license agreements. See the NOTICE file distributed with
// this work for additional information regarding copyright
// ownership. NASA JPL licenses this file to you under
// the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

const { gitDescribeSync } = require('git-describe');
const { version } = require('../package.json');
const { resolve, relative } = require('path');
const { writeFileSync } = require('fs-extra');
const { execSync } = require('child_process');

const gitInfo = gitDescribeSync({
    dirtyMark: false,
    dirtySemver: false
});

gitInfo.version = version;
var pversion = process.argv.slice(2);

const lastCommitDate = Number(execSync('git log -1 --format=%ct').toString().trim() || 0);

var v = {
    "raw": pversion[0],
    "hash": gitInfo.hash,
    "tag": pversion[0],
    "semver": {
        "raw": pversion[0],
        "version": pversion[0]
    },
    "lastCommitDate": lastCommitDate
}
const file = resolve(__dirname, '..', 'src', 'environments', 'version.ts');
writeFileSync(file,
`// IMPORTANT: THIS FILE IS AUTO GENERATED! DO NOT MANUALLY EDIT OR CHECKIN!
/* tslint:disable */
export const VERSION = ${JSON.stringify(v, null, 4)};
/* tslint:enable */
`, { encoding: 'utf-8' });

console.log(`Passvd version is: ${pversion}`)
