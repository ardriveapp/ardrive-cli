#!/bin/bash

myFolders=(
    "dedace8e-9d10-455f-ac47-25336fd3117b"
)

for publicFolder in ${myFolders[@]}; do
    yarn ardrive download-folder -f $publicFolder --local-path /home/node/tmp
done

exit 0
