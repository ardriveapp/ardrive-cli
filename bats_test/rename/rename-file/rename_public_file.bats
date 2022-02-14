#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# File methods. DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-file/load.bash'
# Assertions.  DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-assert/load.bash'

# The function which builds and runs the command
load './rename_file.sh'
# A function which triggers the rename with invalid names. DEPENDS on rename_file.sh
load './rename_invalid_names.sh'
# A function which triggers a rename with an already in use name. DEPENDS on rename_file.sh
load './rename_colliding_name.sh'
# A function which triggers a rename with exactly the same name. DEPENDS on rename_file.sh
load './rename_same_name.sh'
# Constants
load '../../constants.sh'

DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

setup_file() {
    cd /home/node/ardrive-cli
}

@test 'Errors out if the name is invalid' {
    run rename_invalid_names

    # Note 1: The above function runs the command with multiple invalid examples, so we get multiple lines logged in this case
    # Note 2: We don't assert for the exit code (a.k.a. "${status}") here because of `Note 1`, so we assert the error by reading the output

    assert_line -n 0 'Error: The file name must not exceed 255 bytes'
}

@test 'Errors out if the rename would end up in a name collision' {
    run -1 rename_colliding_name
    
    assert_output "Error: There already is an entity named that way"
}

@test 'Errors out if renaming would end up having no effect' {
    run -1 rename_same_name
    
    assert_output "Error: To rename a file, the new name must be different"
}

@test 'Succeeds when a healthy input is given' {
    run -0 rename_file ${PUB_FILE_ID} "ArFS Standard compilant name.txt"

    assert_line -n 0 '{'
    assert_line -n 1 '    "created": ['
    assert_line -n 2 '        {'
    assert_line -n 3 '            "type": "file",'
    assert_line -n 4 "            \"entityId\": \"${PUB_FILE_ID}\","
    assert_line -n 5 --regexp '^            "metadataTxId": "(\w|-)+"$'
    assert_line -n 6 '        }'
    assert_line -n 7 '    ],'
    assert_line -n 8 '    "tips": [],'
    assert_line -n 9 '    "fees": {'
    assert_line -n 10 --regexp '^        "(\w|-)+": "[0-9]+"$'
    assert_line -n 11 '    }'
    assert_line -n 12 '}'
}
