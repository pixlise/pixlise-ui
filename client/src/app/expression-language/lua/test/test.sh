#!/bin/bash
set -e
echo "Running unit tests for all files named *-test.lua..."
for filename in ./*-test.lua; do
    echo $filename
    lua $filename
done
