# Interact with a wallet



## Automatically load wallet entities

### On a detached setup

We need a wallet with BOTH a balance and a pre-existent Public Drive. 

The method listed below will **only** work with a [detached setup](https://github.com/ardriveapp/ardrive-bats-docker/tree/production#detached)

Using this command will not only copy our wallet inside the container, but also automatically load the public IDs for both a Drive and a Folder within the wallet into the following variables:

```$PUB_DRIVE_ID```

```$PUB_FOLD_ID```

Just copy and paste this command replacing the wallet path with yours.

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
