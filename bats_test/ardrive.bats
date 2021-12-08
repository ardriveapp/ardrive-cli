#!/usr/bin/env bats

@test "'ardrive' with no input arguments prints general help with all expected commands" {
    run yarn ardrive
    [ "${status}" -eq 0 ]
    [[ "$output" = "Usage: ardrive [command] [command-specific options]

Options:
  -h, --help                 display help for command

Commands:
  base-reward [options]
  create-drive [options]
  create-folder [options]
  create-manifest [options]
  create-tx [options]
  drive-info [options]
  file-info [options]
  folder-info [options]
  generate-seedphrase
  generate-wallet [options]
  get-address [options]
  get-balance [options]
  get-drive-key [options]
  get-file-key [options]
  get-mempool
  last-tx [options]
  list-all-drives [options]
  list-drive [options]
  list-folder [options]
  move-file [options]
  move-folder [options]
  send-ar [options]
  send-tx [options]
  tx-status [options]
  upload-file [options]
  help [command]             display help for command" ]]
}
