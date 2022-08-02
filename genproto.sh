#!/bin/bash
set -e

echo "Generating protobuf files..."
mkdir -p ./client/src/app/protolibs/

protoc -I=./data-formats --js_out=import_style=commonjs,binary:./client/src/app/protolibs/ ./data-formats/experiment.proto
protoc -I=./data-formats --js_out=import_style=commonjs,binary:./client/src/app/protolibs/ ./data-formats/quantification.proto
protoc -I=./data-formats --js_out=import_style=commonjs,binary:./client/src/app/protolibs/ ./data-formats/diffraction.proto

echo "Done"
