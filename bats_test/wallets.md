# Interact with a wallet
## Automatically load wallet entities

We need a wallet with BOTH a balance and a pre-existent Public Drive containing at least a file. 

The method listed below will **only** work on a terminal in your host system

Using this command will not only copy our wallet inside the container, but also automatically load values for a Drive a Folder and a file within the wallet into the following variables:

```$PUB_DRIVE_ID```

```$PUB_FILE_ID```

```$PUB_FILE_SIZE``` (in bytes)

```$PUB_FILE_NAME```

```$ROOT_FOLDER_ID```

```$PARENT_FOLDER_ID``` (parent of PUB_FILE_IDs)


Just copy and paste this command (again, on your host terminal) replacing the wallet path with yours:

```docker exec -i ardrive-cli-bats bash -c 'cat > /home/node/tmp/wallet.json' < [path to my wallet file]```

Then, switch to *ardrive-cli-bats* docker and run ```exec $SHELL```

To copy a wallet AND automatically get a SHELL with everything loaded, use this command instead:

```docker exec -i ardrive-cli-bats bash -c 'cat > /home/node/tmp/wallet.json' < [path to my wallet file] && docker exec -ti ardrive-cli-bats bash -c 'exec $SHELL -l'```

### Other setups

To automatically load entities, FIRST you need to load a wallet using the method listed above on hot to [put your wallet inside a container](https://github.com/ardriveapp/ardrive-bats-docker/tree/production#put-wallet-inside-your-container)

After that, execute the following command inside the container terminal:

```exec $SHELL -l```

## Wallet Operations

There is a $WALLET variable directly pointing to /home/node/tmp/wallet.json inside the Docker.

In order to run any command that requires a wallet you could just replace its path with $WALLET

e.g. for a private file

``yarn ardrive file-info -f [file-id] -w $WALLET -p [my-unsafe-password]``
