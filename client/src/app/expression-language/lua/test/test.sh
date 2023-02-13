#!/bin/bash
echo "Running unit tests for all files named *-test.lua..."
for filename in ./*-test.lua; do
    lua54 $filename
done