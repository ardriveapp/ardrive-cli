#!/bin/bash

# Depends on ./rename_file.sh

rename_same_name() {
    # File ID at Drive with ID: c0c8ba1c-efc5-420d-a07c-a755dc67f6b2
    PUBLIC_FILE_ID="290a3f9a-37b2-4f0f-a899-6fac983833b3"
    ON_CHAIN_FILE_NAME="1 space test.zip"

    rename_file "${PUBLIC_FILE_ID}" "${ON_CHAIN_FILE_NAME}"

    exit $?
}
