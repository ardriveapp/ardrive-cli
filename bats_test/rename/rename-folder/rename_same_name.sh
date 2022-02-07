#!/bin/bash

# Depends on ./rename_folder.sh

rename_same_name() {
    rename_folder "${FOLDER_ID}" "${FOLDER_NAME}"

    exit $?
}
