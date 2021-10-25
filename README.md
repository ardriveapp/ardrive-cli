# ardrive-cli

The _ArDrive Command Line Interface (CLI)_ is a Node.js application for terminal-based [ArDrive] workflows. It also offers utility operations for securely interacting with Arweave wallets and inspecting various [Arweave] blockchain conditions.

Create your first drive and permanently store your first file on the permaweb with a series of simple CLI commands like so:

```shell
$ ardrive create-drive --wallet-file /path/to/my/wallet.json --drive-name "Teenage Love Poetry"
{
    "created": [
        {
            "type": "drive",
            "metadataTxId": "giv2R8Xj0bbe6l5taBTQJk_38zwIrMH_g1-knSCisjU",
            "entityId": "898687ea-b678-4f86-b4e7-49560b190356"
        },
        {
            "type": "folder",
            "metadataTxId": "VljnttwUxRStnVuPYakF9e2whjhYJVWB0nSxD5dVyJ8",
            "entityId": "f0c58c11-430c-4383-8e54-4d864cc7e927"
        }
    ],
    "tips": [],
    "fees": {
        "giv2R8Xj0bbe6l5taBTQJk_38zwIrMH_g1-knSCisjU": 1415103,
        "VljnttwUxRStnVuPYakF9e2whjhYJVWB0nSxD5dVyJ8": 1391904
    }
}

$ ardrive upload-file --wallet-file /path/to/my/wallet.json --parent-folder-id "f0c58c11-430c-4383-8e54-4d864cc7e927" --local-file-path ./helloworld.txt --dest-file-name "ode_to_ardrive.txt"
{
    "created": [
        {
            "type": "file",
            "metadataTxId": "EvE06MmE9IKeUzFMnxSgY1M5tJX4uHU64-n8Pf_lZfU",
            "dataTxId": "tSMcfvAQu_tKLUkdvRRbqdX93oAf3h6c9eJsSj8mXL4",
            "entityId": "bd2ce978-6ede-4b0d-8f79-2d7bc235a0e0"
        }
    ],
    "tips": [
        {
            "txId": "FidEhcZtmDtvQxWrnVJlKnj_ZkwxYXvn7wjbUpasRKo",
            "recipient": {
                "address": "i325n3L2UvgcavEM8UnFfY0OWBiyf2RrbNsLStPI73o"
            },
            "winston": "10000000"
        }
    ],
    "fees": {
        "tSMcfvAQu_tKLUkdvRRbqdX93oAf3h6c9eJsSj8mXL4": 1384601,
        "EvE06MmE9IKeUzFMnxSgY1M5tJX4uHU64-n8Pf_lZfU": 1447752,
        "FidEhcZtmDtvQxWrnVJlKnj_ZkwxYXvn7wjbUpasRKo": 1379016
    }
}
```

# Table of Contents

1. [ArDrive](#ardrive)
    1. [ArFS](#arfs)
    2. [Data Portability](#data-portability)
    3. [Intended Audience](#intended-audience)
2. [Getting Started](#getting-started)
    1. [Install Yarn 2 (CLI Users and Developers)](#yarn2)
    2. [Husky (Developers Only)](#husky)
    3. [NVM (Optional - Recommended)](#nvm)
    4. [Using a custom ArDrive-Core-JS (Optional - Developers)](#custom-ardrive-core-js)
    5. [Installing and Starting the CLI From NPM Package (CLI Users)](#install-from-npm)
    6. [Installing and Starting the CLI From Source (CLI Users and Developers)](#install-from-src)
    7. [Recommended Visual Studio Code extensions (Developers Only)](#vs-extensions)
    8. [Limitations](#limitations)
3. [Using the CLI](#using-the-cli)
    1. [CLI Help](#cli-help)
    2. [Wallet Operations](#wallet-operations)
    3. [Working With Entities](#working-with-entities)
    4. [Working With Drives](#working-with-drives)
        1. [Understanding Drive Hierarchies](#understanding-drive-hierarchies)
            1. [Fetching Drive Info](#drive-info)
        2. [Understanding Drive and File Keys](#understanding-drive-and-file-keys)
            1. [Derive a Drive Key](#derive-drive-key)
            2. [Derive a File Key](#derive-file-key)
        3. [Managing Drive Passwords](#managing-drive-passwords)
            1. [Supplying Your Password: Environment Variable](#pw-environment-variable)
            2. [Supplying Your Password: STDIN](#pw-stdin)
            3. [Supplying Your Password: Prompt](#pw-prompt)
        4. [Creating Drives](#creating-drives)
        5. [Listing Drives for an Address](#listing-drives-for-an-address)
        6. [Listing Every Entity in a Drive](#list-drive)
    5. [Working With Folders](#working-with-folders)
        1. [Creating Folders](#creating-folders)
        2. [Moving Folders](#moving-folders)
    6. [Working With Files](#working-with-files)
    7. [Other Utility Operations](#other-utility-operations)
        1. [Monitoring Transactions](#monitoring-transactions)
        2. [Dealing With Network Congestion](#dealing-with-network-congestion)
        3. [Check for network congestion before uploading](#check-congestion)
        4. [Front-run Congestion By Boosting Miner Rewards](#boost)
4. [Getting Help](#getting-help)

# ArDrive

[ArDrive] is a permanent storage platform whose [applications and core libraries][ardrive-github] offer hierarchical organization, privacy via complete end-to-end encryption, flexibility, extensibility, and access control over your most valuable data, all made possible by its innovative core technology, the [Arweave File System (ArFS) Protocol][arfs].

## ArFS

[ArFS] is a data modeling, storage, and retrieval protocol designed to emulate common file system operations and to provide aspects of mutabilty to your data hierarchy on [Arweave]'s otherwise permanent, immutable data storage blockweave.

## Data Portability

Data uploaded via the ArDrive CLI, once indexed by Arweave's Gateways and sufficiently seeded across enough nodes on the network, can be accessed via all other ArDrive applications including the [ArDrive Web application][ardrive-web-app] at https://app.ardrive.io.

All transactions successfully executed by ArDrive can always be inspected in the [Viewblock blockchain explorer].

## Intended Audience

This tool is intended for use by:

<ul>
<li>ArDrive power users with advanced workflows and resource efficiency in mind: bulk uploaders, those with larger storage demand, game developers, nft creators, storage/db admins, etc.</li>
<li>Automation tools</li>
<li>Services</li>
<li>Terminal afficionados</li>
<li>Extant and aspiring cypherpunks</li>
</ul>

For deeper integrations with the [ArDrive] platform, consider using the [ArDrive Core][ardrive-core] (Node) library's configurable and intuitive class interfaces directly within your application.

# Getting Started

CLI users and developers must both follow these steps to get the application and/or developer environment up and running:

## Install Yarn 2 (CLI Users and Developers)<a id="yarn2"></a>

Both the ArDrive CLI and ArDrive Core JS use Yarn 2 to manage dependencies and initiate workflows, so follow the [yarn installation instructions][yarn-install] in order to get the latest version. In most cases:

```shell
# Brew (OSX):
brew install yarn

# Or with NPM (all supported platforms):
npm install -g yarn
```

## Husky (Developers Only)<a id="husky"></a>

We use husky 6.x to manage the git commit hooks that help to improve the quality of our commits. Please run:

```shell
yarn husky install
```

to enable git hooks for your local checkout. Without doing so, you risk committing non-compliant code to the repository.

## NVM (Optional - Recommended)<a id="nvm"></a>

This repository uses the Node Version Manager (NVM) and an `.nvmrc` file to lock the Node version to the current version used by `ardrive-core-js`.

**Note for Windows: We recommend using WSL for setting up NVM on Windows using the [instructions described here][wsl-install]**

Follow these steps to get NVM up and running on your system:

1. Install NVM using [these installation instructions][nvm-install].
2. Navigate to this project's root directory
3. Ensure that the correct version of Node is installed by performing: `nvm install`
4. Use the correct version of Node, by performing: `nvm use`

## Using a custom ArDrive-Core-JS (Optional - Developers)<a id="custom-ardrive-core-js"></a>

To test a with a custom version of the `ardrive-core-js` library on your local system, change the `"ardrive-core-js"` line in `package.json` to the root of your local `ardrive-core-js` repo:

```diff
- "ardrive-core-js": "1.0.0"
+ "ardrive-core-js": "../ardrive-core-js/"
```

## Installing and Starting the CLI From NPM Package (CLI Users)<a id="install-from-npm"></a>

```shell
npm install -g ardrive-cli

# then invoke the CLI from anywhere on your system:
$ ardrive
```

## Installing and Starting the CLI From Source (CLI Users and Developers)<a id="install-from-src"></a>

Now that your runtime and/or development environment is set up, to install the package simply run:

```shell
yarn && yarn build
```

And then start the CLI (always from the root of this repository):

```shell
yarn ardrive
```

For convenience in the **non-developer case**, you can install the CLI globally on your system by performing the following step:

```shell
yarn pack

# then using the path generated by yarn from the step above:
npm install i -g /path/to/package.tgz

# then invoke the CLI from anywhere on your system:
$ ardrive
```

## Recommended Visual Studio Code extensions (Developers Only)<a id="vs-extensions"></a>

To ensure your environment is compatible, we also recommend the following VSCode extensions:

-   [ES-Lint][eslint-vscode]
-   [Editor-Config][editor-config-vscode]
-   [Prettier][prettier-vscode]
-   [ZipFS][zipfs-vscode]

## Limitations

**Number of files in a bulk upload:** Theoretically unlimited<br>
**Max individual file size**: 2GB (Node.js limitation)<br>
**Max ANS-104 bundled transaction size:** Not yet implemented. 2GB per bundle. App will handle creating multiple bundles.<br>
**Max ANS-104 data item counts per bundled transaction:** Not yet implemented. Also not adequately specified, though a very large number of data items per bundle is associated with increased rates of GQL indexing failure.

# Using the CLI

## CLI Help

Learn to use any command:

```shell
$ ardrive --help
```

## Wallet Operations

Browsing of ArDrive public data is possible without the need for an [Arweave wallet][kb-wallets]. However, for all write operations, or read operations without encryption/descryption keys, you'll need a wallet.<br>

As you utilize the CLI, you can use either your wallet file or your seed phrase interchangeably. Consider the security implications of each approach for your particular use case carefully. If at any time you'd like to generate a new wallet altogether, start by generating a new seed phase. And if you'd like to use that seed phrase in the form of a wallet file, or if you'd like to recover an existing wallet via its seed phrase, use either or both of the following commands:<br>

```shell
# Generate seed-phrase
$ ardrive generate-seedphrase
"this is an example twelve word seed phrase that you could use"

# Generate/recover wallet file (with example output file path)
$ ardrive generate-wallet -s "this is an example twelve word seed phrase that you could use" > /path/to/wallet/file.json
```

Public attributes of Arweave wallets can be retrieved via their 43-character Arweave wallet address. You can retrieve the wallet address associated with [your wallet file or 12-word seed phrase][kb-wallets] (e.g. wallets generated by [ArConnect][arconnect]) like so:

```shell
# Wallet file
$ ardrive get-address -w /path/to/wallet/file.json

# Seed Phrase (with sample output)
$ ardrive get-address -s "this is an example twelve word seed phrase that you could use"
HTTn8F92tR32N8wuo-NIDkjmqPknrbl10JWo5MZ9x2k
```

You'll need AR in your wallet for any write operations you perform in ArDrive. You can always check your wallet balance (in both AR and Winston units) by performing:

```shell
# Getting the balance for your own wallet
$ ardrive get-balance -w /path/to/wallet/file.json

# Getting the balance for ANY wallet (with sample output)
$ ardrive get-balance -a "HTTn8F92tR32N8wuo-NIDkjmqPknrbl10JWo5MZ9x2k"
1500000000000	Winston
1.5	AR
```

If, at any time, you need to send AR out of your wallet to another wallet address, you may perform:

```shell
# Using our previously generated wallet as the destination...
$ ardrive send-ar -w /path/to/wallet/file.json --dest-address "HTTn8F92tR32N8wuo-NIDkjmqPknrbl10JWo5MZ9x2k" --ar-amount 2.12345
```

## Working With Entities

[ArDrive]'s [ArFS] integration provides for hierarchical organization of your file and folder data on Arweave.<br>

The fundamental entity types specified by ArFS are:

<ul>
<li>Drives</li>
<li>Folders</li>
<li>Files</li>
</ul>

Each instance of these entities have a Version 4 UUID entity ID that is commonly referred to by its entity type, i.e. drive ID, folder ID, and file ID.<br>

When you execute write functions with the CLI, the JSON output will contain information about the Arweave Transaction IDs that were registered when writing your entities to the blockweave, any miner rewards or [ArDrive Community](https://ardrive.io/community/) tips that were disbursed from your wallet, and any new entity IDs and, when applicable, encryption keys that were generated in the process of creating the entities. Typically, you'll want to keep track of those and get proficient with retrieving them in order to build your drive hierarchy to your liking. See [Understanding Drive and File Keys](#understanding-drive-and-file-keys) for more info.

## Working With Drives

### Understanding Drive Hierarchies

At the root of every data tree is a "Drive" entity. When a drive is created, a Root Folder is also created for it. The entity IDs for both are generated and returned when you create a new drive:

```shell
# Use `tee` to keep a receipt of the full set of transactions info and `jq` to focus on the data of interest
$ ardrive create-drive --wallet-file /path/to/my/wallet.json --drive-name "Teenage Love Poetry" |
tee created_drive.json |
jq '[.created[] | del(.metadataTxId)]'
[
    {
        "type": "drive",
        "entityId": "6939b9e0-cc98-42cb-bae0-5888eca78885"
    }
    {
        "type": "folder",
        "entityId": "d1535126-fded-4990-809f-83a06f2a1118"
    }
]
```

The relationship between the drive and its root folder is clearly visible when retrieving the drive's info:<a id='drive-info'></a>

```shell
$ ardrive drive-info -d "6939b9e0-cc98-42cb-bae0-5888eca78885"
| jq '{driveId, rootFolderId}'
{
    "driveId": "6939b9e0-cc98-42cb-bae0-5888eca78885",
    "rootFolderId": "d1535126-fded-4990-809f-83a06f2a1118"
}

```

All file and folder entities in the drive will be anchored to it by a "Drive-ID" GQL Tag. And they'll each be anchored to a parent folder ID, tracked via the "Parent-Folder-ID" GQL tag, forming a tree structure whose base terminates at the Root Folder.<br>

### Understanding Drive and File Keys

Private Drives achieve privacy via end-to-end encryption facilitated by hash-derived "Keys". Drive Keys encrypt/decrypt Drive and Folder data, and File Keys encrypt/decrypt File Data.<br> The relationships among your data and their keys is as follows:

<ul>
<li>Drive Key = functionOf(Wallet Signature, Randomly Generated Drive ID, User-specified Drive Password)</li>
<li>File Key = functionOf(Randomly Generated File ID, Drive Key)</li>
</ul>

When you create private entities, the returned JSON data from the ArDrive CLI will contain the keys needed to decrypt the encypted representation of your entity that is now securely and permanently stored on the blockweave.<br>

To derive the drive key again for a drive, perform the following:<a id="derive-drive-key"></a>

```
# Will throw an error if the wallet or password specified can't be used to decrypt the on-chain drive
$ ardrive get-drive-key -w /path/to/my/wallet.json -d "6939b9e0-cc98-42cb-bae0-5888eca78885" -P
```

To derive the file key again for a file, perform the following:<a id="derive-file-key"></a>

```
# Will throw an error if the drive key or drive-key-derivation data specified can't be used to decrypt the on-chain file
$ ardrive get-file-key --file-id "bd2ce978-6ede-4b0d-8f79-2d7bc235a0e0" --drive-id "6939b9e0-cc98-42cb-bae0-5888eca78885" --drive-key "yHdCjpCK3EcuhQcKNx2d/NN5ReEjoKfZVqKunlCnPEo"
```

### Managing Drive Passwords

The ArDrive CLI's private drive and folder functions all require either a drive password OR a drive key. Private file functions require either the drive password or the file key. **Keys and passwords are sensitive data, so manage the entry, display, storage, and transmission of them very carefully.**<br>

Drive passwords are the most portable, and fundamental, encryption facet, so a few options are available during private drive operations for supplying them:

<ul>
<li>Environment Variable</li>
<li>STDIN</li>
<li>Secure Prompt</li>
</ul>

#### Supplying Your Password: Environment Variable<a id="pw-environment-variable"></a>

```shell
# Securely type your password into a read prompt, store it to TMP_ARDRIVE_PW, and export it for the shell session
read -rs TMP_ARDRIVE_PW
export ARDRIVE_DRIVE_PW=$(TMP_ARDRIVE_PW)
$ ardrive <some private command> -w /path/to/wallet.json -P
```

#### Supplying Your Password: STDIN<a id="pw-stdin"></a>

```shell
# Pipe your drive password to the ArDrive CLI
$ cat /path/to/my/drive/password.txt | ardrive <some private command> -w /path/to/wallet.json -P

# Redirect your drive password to the ArDrive CLI
$ ardrive <some private command> -w /path/to/wallet.json -P < /path/to/my/drive/password.txt
```

#### Supplying Your Password: Prompt<a id="pw-prompt"></a>

```shell
# When all other options fail, the CLI will prompt for your password (NOT COMPATIBLE WITH PIPES AND REDIRECTS!)
$ ardrive <some private command> -w /path/to/wallet.json -P
? Enter drive password: › ********
```

### Creating Drives

```shell
# Public drive
$ ardrive create-drive --wallet-file /path/to/my/wallet.json --drive-name "My Public Archive"

# Private drive
$ ardrive create-drive --wallet-file /path/to/my/wallet.json --drive-name "Teenage Love Poetry" -P
```

### Listing Drives for an Address

You can list all the drives associated with any Arweave wallet address, though the details of private drives will be obfuscated from you unless you provide the necessary decryption data.

```shell
# List all your own drives
$ ardrive list-all-drives -w /path/to/my/wallet.json -P

# List any address's drives
$ ardrive list-all-drives --address "HTTn8F92tR32N8wuo-NIDkjmqPknrbl10JWo5MZ9x2k"
```

### Listing Every Entity in a Drive<a id="list-drive"></a>

Useful notes on listing the contents of drives:

<ul>
<li>Listing a drive is effectively the same as listing its root folder.</li>
<li>You can control the tree depth of the data returned.</li>
<li>path, txPath, and entityIdPath properties on entities can provide useful handholds for other forms of data navigation</li>
</li>

```shell
# List everything in a private drive
$ ardrive list-drive -d "c7f87712-b54e-4491-bc96-1c5fa7b1da50" -w /path/to/my/wallet.json -P

# List the contents of a public drive up to and including those in the grandchild folders of the root folder
$ ardrive list-drive -d "c7f87712-b54e-4491-bc96-1c5fa7b1da50" --max-depth 2
```

## Working With Folders

As discussed previously, all folders in a drive are linked by way of parent folder references back to the root folder of a drive. Folders can be moved into any folder in the hierarchy that's not in their own subtree.

### Creating Folders

Creating folders manually is straightforward:

```shell
$ ardrive create-folder --parent-folder-id "63153bb3-2ca9-4d42-9106-0ce82e793321" --name "My Awesome Folder" -w /path/to/wallet.json
```

When supplying a folder for the --local-file-path during an upload-file command, however, the folder hierarchy on the local disk will be reconstructed on chain during the course of the recursive bulk upload.

### Moving Folders

Moving a folder is as simple as supplying a new parent folder ID. Note that naming collisions among entities within a folder are not allowed.

```shell
ardrive move-folder --folder-id "9af694f6-4cfc-4eee-88a8-1b02704760c0" --parent-folder-id "29850ab7-56d4-4e1f-a5be-cb86d5513921" -w /path/to/wallet.json
```

## Working With Files

Add a local folder to a new public drive:<br>
NOTE: To upload to the root of a drive, specify its root folder ID as the parent folder ID for the upload destiantion.

```shell
# Use `tee` to store command json outputs for later review/backup/automation/etc.
# Use `jq` to parse json output and retrieve the root folder ID for use in downstream command
$ ardrive create-drive -w /path/to/wallet.json -n "My Public Archive" |
tee create_drive_output.json |
jq -r '.created[] | select(.type == "folder") | .entityId' |
while read -r parentFolderId; do
ardrive upload-file -w /path/to/wallet.json --local-file-path ./myarchives -F "$parentFolderId";
done |
tee upload_folder_output.json
```

## Other Utility Operations

### Monitoring Transactions

Block time on Arweave is typically between 2-3 minutes in duration, so transactions can be mined within that time frame when [network congestion](#dealing-with-network-congestion) is low. Transactions, in the general case, proceed through the following set of states:

-   Pending: the transaction is waiting the "mempool" to be mined
-   Confirming: the transaction was mined on an Arweave Node, but has not yet been confirmed by at least 15 total nodes on the network
-   Confirmed: the transaction was mined on an Arweave Node and confirmed by at least 15 total nodes on the network
-   Not Found: the transaction is not available for any of the following reasons:
    -   Insufficient reward to join the mempool
    -   Insufficient reward to be mined within 50 blocks during a period of network congestion
    -   Transaction is transitioning between states
    -   Transaction ID is invalid

Monitor any Arweave transaction's status via its transaction ID by performing:

```shell
# Peek at the status:
$ yarn ardrive tx-status -t "ekSMckikdRJ8RGIkFa-X3xq3427tvM7J9adv8HP3Bzs"

# Reprint the status every 10 seconds:
$ watch -n 10 yarn ardrive tx-status -t "ekSMckikdRJ8RGIkFa-X3xq3427tvM7J9adv8HP3Bzs"
```

### Dealing With Network Congestion

Currently, Arweave blocks hold up to 1000 transactions per block. The "mempool", where pending transacions reside until they've been included into a block, will only hold a transaction for 50 blocks (~100-150 minutes) before it's discarded by the network resulting in no fees or data being transacted. During periods of network congestion (i.e. those where the mempool contains 1000 or more pending transactions), it may make sense to either:
a) wait for congestion to dissipate before attempting your transactions.
b) apply the fee boost multiplier to your transactions rewards with the --boost parameter during write operations in order to front-run some of the congestion.

#### Check for network congestion before uploading<a id="check-congestion"></a>

```shell
# See all the transactions in the mempool
$ ardrive get-mempool

# Return the count of the transactions in the mempool
$ ardrive get-mempool | jq 'length'
```

#### Front-run Congestion By Boosting Miner Rewards<a id="boost"></a>

```shell
# Increase the miner reward on your transactions by 50%
$ ardrive upload-file --wallet-file /path/to/my/wallet.json --parent-folder-id "f0c58c11-430c-4383-8e54-4d864cc7e927" --local-file-path ./helloworld.txt --boost 1.5
```

TODO:
list out the drive info to get the ar:// links
upload files/folders
show how list drive could be piped into things like...

-   get number of files
-   get size
-   get other cool things?

upload a single file to it, move another file into that new folder
get all info for a specific file
generating share urls
list all commands

# Getting Help

[ArDrive Community Discord][ardrive-discord]

[ardrive]: https://ardrive.io
[arweave]: https://ardrive.io/what-is-arweave/
[ardrive-github]: https://github.com/ardriveapp/
[arfs]: https://ardrive.atlassian.net/l/c/yDcGDbUm
[ardrive-web-app]: https://app.ardrive.io
[ardrive-core]: https://github.com/ardriveapp/ardrive-core-js
[yarn-install]: https://yarnpkg.com/getting-started/install
[nvm-install]: https://github.com/nvm-sh/nvm#installing-and-updating
[wsl-install]: https://code.visualstudio.com/docs/remote/wsl
[editor-config-vscode]: https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig
[prettier-vscode]: https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
[zipfs-vscode]: https://marketplace.visualstudio.com/items?itemName=arcanis.vscode-zipfs
[eslint-vscode]: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
[viewblock blockchain explorer]: https://viewblock.io/arweave/
[ardrive-discord]: https://discord.gg/w4vvrezD
[arconnect]: https://arconnect.io/
[kb-wallets]: https://ardrive.atlassian.net/l/c/FpK8FuoQ
