#!/bin/bash

download_public_drive() {
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

download_private_drive() {
    DRIVE_ID="${1}"
    LOCAL_PATH="${2}"
    MAX_DEPTH="${3}"
    UNSAFE_PASSWORD="${4}"
    DRIVE_KEY="${5}"

    ARDRIVE_CMD="yarn ardrive download-drive \
        $([ "${DRIVE_ID}" != "" ] && echo "-d ${DRIVE_ID}" )
        $([ "${LOCAL_PATH}" != "" ] && echo "--local-path=${LOCAL_PATH}") \
        $([ "${MAX_DEPTH}" != "" ] && echo "--max-depth=${MAX_DEPTH}") \
        $(
            [ "${UNSAFE_PASSWORD}" != "" ] && echo "--unsafe-drive-password=${UNSAFE_PASSWORD}" || 
            [ "${DRIVE_KEY}" != "" ] && echo "--drive-key=${DRIVE_KEY}" || echo "-P"
        )"

    ${ARDRIVE_CMD}
    exit $?
}