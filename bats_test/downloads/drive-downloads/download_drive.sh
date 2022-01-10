#!/bin/bash

download_drive() {
    DRIVE_ID="${1}"
    LOCAL_PATH="${2}"
    MAX_DEPTH="${3}"

    ARDRIVE_CMD="yarn ardrive download-drive \
        $([ "${DRIVE_ID}" != "" ] && echo "-d ${DRIVE_ID}" )
        $([ "${LOCAL_PATH}" != "" ] && echo "--local-path=${LOCAL_PATH}") \
        $([ "${MAX_DEPTH}" != "" ] && echo "--max-depth=${MAX_DEPTH}")"

    ${ARDRIVE_CMD}
    exit $?
}