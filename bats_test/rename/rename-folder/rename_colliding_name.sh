#!/bin/bash

# Depends on ./rename_folder.sh

rename_colliding_name() {
    rename_folder "${FOLDER_ID}" "${PUB_FILE_NAME_ALT}"

    exit $?
}
