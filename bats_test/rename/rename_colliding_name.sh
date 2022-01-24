#!/bin/bash

# Depends on ./rename_file.sh

rename_colliding_name() {
    rename_file "${PUB_FILE_ID}" "${PUB_FILE_NAME_ALT}"

    exit $?
}
