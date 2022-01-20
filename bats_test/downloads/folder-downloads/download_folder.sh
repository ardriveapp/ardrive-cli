#!/bin/bash

download_folder() {
    FOLDER_ID="${1}"
    LOCAL_PATH="${2}"
    MAX_DEPTH="${3}"

    ARDRIVE_CMD="yarn ardrive download-folder \
        $([ "${FOLDER_ID}" != "" ] && echo "-f ${FOLDER_ID}" )
        $([ "${LOCAL_PATH}" != "" ] && echo "--local-path=${LOCAL_PATH}") \
        $([ "${MAX_DEPTH}" != "" ] && echo "--max-depth=${MAX_DEPTH}")"

    ${ARDRIVE_CMD}
    exit $?
}