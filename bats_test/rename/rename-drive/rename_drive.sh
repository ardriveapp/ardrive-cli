#!/bin/bash

# Utility function to build and exec the rename-drive command

rename_drive() {
    DRIVE_ID="${1}"
    NEW_NAME="${2}"

    ARDRIVE_CMD="yarn ardrive rename-drive \
        --dry-run \
        --drive-id \"${DRIVE_ID}\" \
        --drive-name \"${NEW_NAME}\" \
        --wallet-file \"${WALLET}\""

    eval ${ARDRIVE_CMD}
    exit $?
}
