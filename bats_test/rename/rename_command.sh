#!/bin/bash

rename_file() {
    FILE_ID="${1}"
    NEW_NAME="${2}"

    ARDRIVE_CMD="yarn ardrive rename-file \
        --dry-run \
        --file-id \"${FILE_ID}\" \
        --file-name \"${NEW_NAME}\" \
        --wallet-file \"${WALLET}\""

    eval ${ARDRIVE_CMD}
    exit $?
}
