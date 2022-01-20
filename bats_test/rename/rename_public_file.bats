#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# File methods. DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-file/load.bash'
# Assertions.  DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-assert/load.bash'

load './rename_command.sh'
load './rename_invalid_names.sh'
load './rename_colliding.sh'
load './rename_same_name.sh'

DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

setup_file() {
    cd /home/node/ardrive-cli
}

@test 'Errors out if the name is invalid' {
    run rename_invalid_names
    echo OUTPUT ${output} >&3

    assert_line -n 0 "Error: The file name cannot start with spaces"
    assert_line -n 1 "Error: The file name cannot have trailing dots or spaces"
    assert_line -n 2 "Error: The file name cannot have trailing dots or spaces"
    assert_line -n 3 "Error: The file name cannot contain reserved characters (i.e. '\\\\', '/', ':', '*', '?', '\"', '<', '>', '|')"
}

@test 'Errors out if the rename would end up in a name collision' {
    run -1 rename_colliding_name
    
    assert_output "Error: There already is an entity named that way"
}

@test 'Errors out if renaming would end up having no effect' {
    run -1 rename_same_name
    
    assert_output "Error: To rename a file, the new name must be different"
}
