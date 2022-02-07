#!/bin/bash

# Depends on ./rename_drive.sh

rename_invalid_names() {
    echo "$(rename_drive "${PUB_DRIVE_ID}" " leading spaces.txt")"
    echo "$(rename_drive "${PUB_DRIVE_ID}" "trailing spaces.png ")"
    echo "$(rename_drive "${PUB_DRIVE_ID}" "trailing dots.doc.")"
    echo "$(rename_drive "${PUB_DRIVE_ID}" "reserved characters :*.txt")"
}
