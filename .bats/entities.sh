#!/bin/bash

#This script parses a provided $WALLET, and sets ENV variables using the values from the first valid Public file.

## TODO: make this conditional with a flag to avoid reset on new SHELL session
cd $HOME/ardrive-cli/

cache="$(yarn ardrive list-all-drives -w $WALLET)"

# RAW, one line, no brackets and no quotes
pubDriveList="$(echo $cache | jq -rc '.[] | select(.drivePrivacy == "public") | .driveId')"

#Iterates over list of driveIDs from wallet.
for publicDrive in ${pubDriveList[@]}; do
    aux="$(yarn ardrive list-drive -d $publicDrive)"
    numberFiles="$(echo $aux | jq -r '[.[] | select(.entityType == "file")] | length')"
    if [ "$numberFiles" -ge "2" ]; then
        fileID="$(echo $aux | jq -r '[.[] | select(.entityType == "file")][0] | .entityId')"
        fileSize="$(echo $aux | jq -r '[.[] | select(.entityType == "file")][0] | .size')"
        fileName="$(echo $aux | jq -r '[.[] | select(.entityType == "file")][0] | .name')"
        fileNameAlt="$(echo $aux | jq -r '[.[] | select(.entityType == "file")][1] | .name')"
        folderID="$(echo $aux | jq -r '[.[] | select(.entityType == "file")][0] | .parentFolderId')"
        rootID="$(echo $aux | jq -r '[.[] | select(.parentFolderId == "root folder")][0] | .entityId')"
        driveID="$(echo $aux | jq -r '[.[] | select(.entityType == "file")][0] | .driveId')"
        break
    fi
done

export PUB_FILE_ID="$fileID"
export PUB_FILE_SIZE="$fileSize" #in bytes
export PUB_FILE_NAME="$fileName"
export PUB_FILE_NAME_ALT="$fileNameAlt"
export PARENT_FOLDER_ID="$folderID"
export ROOT_FOLDER_ID="$rootID"
export PUB_DRIVE_ID="$driveID"

# To remain compatible with previous behavior
export PUB_FOLD_ID="$rootID"
