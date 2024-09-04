#!/bin/bash

file="$HOME/test_BLUE_.nc"

for i in {1..1000000}; do
    echo "I am a test file and I love it" >>"$file"
done

echo "File creation complete: $file"
