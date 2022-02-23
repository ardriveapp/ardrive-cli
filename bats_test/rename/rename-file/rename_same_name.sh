#!/bin/bash

# Depends on ./rename_file.sh

rename_same_name() {
    rename_file "${PUB_FILE_ID}" "${PUB_FILE_NAME}"

    exit $?
}
