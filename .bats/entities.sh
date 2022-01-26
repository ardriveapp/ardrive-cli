#!/bin/bash

#This script parses a provided $WALLET, and sets ENV variables using the values from the first valid Public file.

## TODO: make this conditional with a flag to avoid reset on new SHELL session
cd $HOME/ardrive-cli/

cache="$(yarn ardrive list-all-drives -w $WALLET)"

# RAW, one line, no brackets and no quotes
allDriveIDs="$(echo $cache | jq -rc '.[] | select(.drivePrivacy == "public") | .driveId')"

#Iterates over list of driveIDs from wallet.
found=0
for publicDriveId in ${allDriveIDs[@]}; do
    driveContent="$(yarn ardrive list-drive -d $publicDriveId)"
    if [[ $? -ne 0 ]]; then
        printf "Error loading entities. Please check your wallet! \n"
        exit 1
    fi
    allFolderIDs="$(echo $driveContent | jq -rc '.[] | select(.entityType == "folder") | .entityId')"

    for someFolderId in ${allFolderIDs[@]}; do
        childFileIDs=($(echo $driveContent | jq -rc ".[] | select((.entityType == \"file\") and .parentFolderId == \"${someFolderId}\") | .entityId"))
        childFolderIDs=($(echo $driveContent | jq -rc ".[] | select((.entityType == \"folder\") and .parentFolderId == \"${someFolderId}\") | .entityId"))

        if [ "${#childFileIDs[@]}" -ge "2" ] && [ "${#childFolderIDs[@]}" -ge "1" ]; then
            parentFolderId="${someFolderId}"
            # The folder contains at least two files and one folder

            folderID="${childFolderIDs[0]}"
            folderName="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"folder\") and .entityId == \"${folderID}\")][0] | .name")"
            rootID="$(echo $driveContent | jq -r '[.[] | select(.parentFolderId == "root folder")][0] | .entityId')"
            driveID="${publicDriveId}"
            fileID="${childFileIDs[0]}"
            fileSize="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"file\") and .parentFolderId == \"${parentFolderId}\")][0] | .size")"
            fileName="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"file\") and .parentFolderId == \"${parentFolderId}\")][0] | .name")"
            fileNameAlt="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"file\") and .parentFolderId == \"${parentFolderId}\")][1] | .name")"

            # escape condition found
            found=1 
        fi

        if [ "${found}" -eq "1" ]; then
            break
        fi
    done

    if [ "${found}" -eq "1" ]; then
        break
    fi
done

if [ "${found}" -eq "0" ]; then
    printf "NO ENTITIES FOUND!\n"
    exit 1
fi

export PUB_FILE_ID="$fileID"
export PUB_FILE_SIZE="$fileSize" #in bytes
export PUB_FILE_NAME="$fileName"
export PUB_FILE_NAME_ALT="$fileNameAlt"
export PARENT_FOLDER_ID="$parentFolderId"
export FOLDER_ID="$folderID"
export FOLDER_NAME="$folderName"
export ROOT_FOLDER_ID="$rootID"
export PUB_DRIVE_ID="$driveID"
export PUB_FOLD_ID="$rootID" # To remain compatible with previous behavior
