#!/bin/bash
set -e

echo "Generating protobuf for file formats..."
mkdir -p ./client/src/app/protolibs/

protoc -I=./data-formats/file-formats --js_out=import_style=commonjs,binary:./client/src/app/protolibs/ ./data-formats/file-formats/experiment.proto
# protoc -I=./data-formats/file-formats --js_out=import_style=commonjs,binary:./client/src/app/protolibs/ ./data-formats/file-formats/quantification.proto
protoc -I=./data-formats/file-formats --js_out=import_style=commonjs,binary:./client/src/app/protolibs/ ./data-formats/file-formats/diffraction.proto

#echo "Done"

echo "Generating protobuf for web socket messaging..."
mkdir -p ./client/src/app/generated-protos

echo "Detected OS: $(uname -s)"
if [[ "$(uname -s)" == *"Linux"* || "$(uname -s)" == "Darwin" ]]; then
    # Linux/Mac
    protoc --plugin=protoc-gen-ts_proto="./client/node_modules/.bin/protoc-gen-ts_proto" --ts_proto_out=./client/src/app/generated-protos/ --proto_path=./data-formats/api-messages ./data-formats/api-messages/*.proto
else
    # Windows
    protoc --plugin=protoc-gen-ts_proto=".\\client\\node_modules\\.bin\\protoc-gen-ts_proto.cmd" --ts_proto_out=./client/src/app/generated-protos/ --proto_path=./data-formats/api-messages ./data-formats/api-messages/*.proto
fi

go run data-formats/codegen/main.go -protoPath ./data-formats/api-messages -angularOutPath ./client/src/app/modules/pixlisecore/services/

# List directories where files were written
echo "Files written:"
find ./client/src/app/generated-protos -type f -name '*.ts'
find ./client/src/app/protolibs -type f -name '*.js'
find ./client/src/app/modules/pixlisecore/services -type f -name '*.go'
