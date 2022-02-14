#!/bin/bash

# Depends on ./rename_drive.sh

rename_same_name() {
    rename_drive "${PUB_DRIVE_ID}" "${PUB_DRIVE_NAME}"

    exit $?
}
