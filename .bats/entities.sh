#!/bin/bash

# This script parses a provided $WALLET, and sets ENV variables extracting the values from the first valid Public Drive.
# The algorithm will look for a folder at any public drive, containing two files and a folder sharing the same parent.

## TODO: make this conditional with a flag to avoid reset on new SHELL session
cd $HOME/ardrive-cli/

# Fetch all drives owned by the provided wallet
cache="$(yarn ardrive list-all-drives -w $WALLET)"
if [[ $? -ne 0 ]]; then
    echo "Error loading entities. Please check your wallet!"
    exit 1
fi

# Parse the ID of the drives
allDriveIDs="$(echo $cache | jq -rc '.[] | select(.drivePrivacy == "public") | .driveId')"

# Auxiliar variable which determines if the algorithm succeed finding the entities. 0: no, 1: yes
found=0

# Iterate over the list of drive IDs
for publicDriveId in ${allDriveIDs[@]}; do
    # Fetch the whole content of the drive being iterated
    driveContent="$(yarn ardrive list-drive -d $publicDriveId)"
    if [[ $? -ne 0 ]]; then
        echo "Error loading entities. Please check your wallet!"
        exit 1
    fi

    # Parse the folder IDs contained in the drive
    allFolderIDs="$(echo $driveContent | jq -rc '.[] | select(.entityType == "folder") | .entityId')"

    # Iterate over each folders on the drive
    for someFolderId in ${allFolderIDs[@]}; do
        # Parse the ID of the children at the folder being iterated
        childFileIDs=($(echo $driveContent | jq -rc ".[] | select((.entityType == \"file\") and .parentFolderId == \"${someFolderId}\") | .entityId"))
        childFolderIDs=($(echo $driveContent | jq -rc ".[] | select((.entityType == \"folder\") and .parentFolderId == \"${someFolderId}\") | .entityId"))

        # Enters the block only if it contains two files and one folder
        if [ "${#childFileIDs[@]}" -ge "2" ] && [ "${#childFolderIDs[@]}" -ge "1" ]; then
            # The parent folder containing the three required entities
            parentFolderId="${someFolderId}"
            # The folder
            folderID="${childFolderIDs[0]}"
            folderName="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"folder\") and .entityId == \"${folderID}\")][0] | .name")"
            # The file #1
            fileID="${childFileIDs[0]}"
            fileSize="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"file\") and .parentFolderId == \"${parentFolderId}\")][0] | .size")"
            fileName="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"file\") and .parentFolderId == \"${parentFolderId}\")][0] | .name")"
            # The file #2
            fileNameAlt="$(echo $driveContent | jq -r "[.[] | select((.entityType == \"file\") and .parentFolderId == \"${parentFolderId}\")][1] | .name")"
            # Root folder and drive IDs
            rootID="$(echo $driveContent | jq -r '[.[] | select(.parentFolderId == "root folder")][0] | .entityId')"
            driveID="${publicDriveId}"

            # escape condition found
            found=1
        fi

        if [ "${found}" -eq "1" ]; then
            # Found, stop iterating folders
            break
        fi
    done

    if [ "${found}" -eq "1" ]; then
        # Found, stop iterating drives
        break
    fi
done

if [ "${found}" -eq "0" ]; then
    echo "COULDN'T FIND A DRIVE CONTAINING A FOLDER WITH TWO FILES AND A FOLDER AS CHILD! CHOOSE ANOTHER WALLET"
    exit 1
fi

# Set the ENV variables
export PUB_FILE_ID="$fileID"
export PUB_FILE_SIZE="$fileSize"
export PUB_FILE_NAME="$fileName"
export PUB_FILE_NAME_ALT="$fileNameAlt"
export PARENT_FOLDER_ID="$parentFolderId"
export FOLDER_ID="$folderID"
export FOLDER_NAME="$folderName"
export ROOT_FOLDER_ID="$rootID"
export PUB_DRIVE_ID="$driveID"
export PUB_FOLD_ID="$rootID" # To remain compatible with the previous behavior
