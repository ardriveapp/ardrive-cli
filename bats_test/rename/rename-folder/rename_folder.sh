#!/bin/bash

# Utility function to build and exec the rename-folder command

rename_folder() {
    FOLDER_ID="${1}"
    NEW_NAME="${2}"

    ARDRIVE_CMD="yarn ardrive rename-folder \
        --dry-run \
        --folder-id \"${FOLDER_ID}\" \
        --folder-name \"${NEW_NAME}\" \
        --wallet-file \"${WALLET}\""

    eval ${ARDRIVE_CMD}
    exit $?
}
