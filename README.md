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

## ArDrive

[ArDrive] is a permanent storage platform whose [applications and core libraries][ardrive-github] offer hierarchical organization, privacy via complete end-to-end encryption, flexibilty, extensibility, and access control over your most valuable data, all made possible by its innovative core technology, the [Arweave File System (ArFS) Protocol][arfs].

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

## Getting Started

CLI users and developers must both follow these steps to get the application and/or developer environment up and running:

### Install Yarn 2 (CLI Users and Developers)

Both the ArDrive CLI and ArDrive Core JS use Yarn 2 to manage dependencies and initiate workflows, so follow the [yarn installation instructions][yarn-install] in order to get the latest version. In most cases:

```shell
# Brew (OSX):
brew install yarn

# Or with NPM (all supported platforms):
npm install -g yarn
```

### Husky (Developers Only)

We use husky 6.x to manage the git commit hooks that help to improve the quality of our commits. Please run:

```shell
yarn husky install
```

to enable git hooks for your local checkout. Without doing so, you risk committing non-compliant code to the repository.

### NVM (Optional - Recommended)

This repository uses the Node Version Manager (NVM) and an `.nvmrc` file to lock the Node version to the current version used by `ardrive-core-js`.

**Note for Windows: We recommend using WSL for setting up NVM on Windows using the [instructions described here][wsl-install]**

Follow these steps to get NVM up and running on your system:

1. Install NVM using [these installation instructions][nvm-install].
2. Navigate to this project's root directory
3. Ensure that the correct version of Node is installed by performing: `nvm install`
4. Use the correct version of Node, by performing: `nvm use`

### Using a custom ArDrive-Core-JS (Optional - Developers)

To test a with a custom version of the `ardrive-core-js` library on your local system, change the `"ardrive-core-js"` line in `package.json` to the root of your local `ardrive-core-js` repo:

```diff
- "ardrive-core-js": "1.0.0"
+ "ardrive-core-js": "../ardrive-core-js/"
```

### Installing and Starting the CLI From NPM Package (CLI Users)

```shell
npm install -g ardrive-cli

# then invoke the CLI from anywhere on your system:
ardrive
```

### Installing and Starting the CLI From Source (CLI Users and Developers)

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
ardrive
```

### Recommended Visual Studio Code extensions (Developers Only)

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

## Using the CLI

### CLI Help

Learn to use any command:

```shell
$ ardrive --help
```

### Wallet Operations

Browsing of ArDrive public data is possible without the need for an [Arweave wallet][kb-wallets]. However, for all write operations, or read operations of your own private data, you'll need a wallet.<br>

As you utilize the CLI, you can use either your wallet file or your seed phrase interchangeably. Consider the security implications of each approach for your particular use case carefully. If at any time you'd like to generate a new wallet altogether, start by generating a new seed phase. And if you'd like to use that seed phrase in the form of a wallet file, or if you'd like to recover an existing wallet via its seed phrase, use either or both of the following commands:<br>

```shell
# Generate seed-phrase
$ ardrive generate-seedphrase
"this is an example twelve word seed phrase that you could use"

# Generate/recover wallet file (with example output file path)
ardrive generate-wallet -s "this is an example twelve word seed phrase that you could use" > /path/to/wallet/file.json
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

# Getting the balance for ANY wallet and example output
$ ardrive get-balance -a "HTTn8F92tR32N8wuo-NIDkjmqPknrbl10JWo5MZ9x2k"
1500000000000	Winston
1.5	AR
```

If, at any time, you need to send AR out of your wallet to another wallet address, you may perform:

```shell
# Using our previously generated wallet as the destination...
$ ardrive send-ar -w /path/to/wallet/file.json --dest-address "HTTn8F92tR32N8wuo-NIDkjmqPknrbl10JWo5MZ9x2k" --ar-amount 2.12345
```

### Working with Drives

#### Understanding Drive Hierarchies

[ArDrive]'s [ArFS] integration provides for hierarchical organization of your file and folder data.<br>

At the root of every data tree is a "Drive" entity. When a drive is created, a Root Folder is also created for it. All file and folder entities in the drive will be anchored to it by a "Drive-ID" GQL Tag. And they'll each be anchored to a Parent Folder ID, forming a tree structure whose base terminates at the Root Folder.<br>

#### Understanding Drive and File Keys

Private Drives achieve privacy via end-to-end encryption facilitated by hash-derived "Keys". Drive Keys encrypt/decrypt Drive and Folder data, and File Keys encrypt/decrypt File Data.<br> The relationships among your data and their keys is as follows:

<ul>
<li>Drive Key = functionOf(Wallet Signature, Randomly Generated Drive ID, User-specified Drive Password)</li>
<li>File Key = functionOf(Randomly Generated File ID, Drive Key)</li>
</ul>

When you create private entities, the returned JSON data from the ArDrive CLI will contain the keys needed to decrypt the encypted representation of your entity that is now securely and permanently stored on the blockweave.<br>

#### Managing Drive Passwords

The ArDrive CLI's private drive and folder functions all require either a drive password OR a drive key. Private file functions require either the drive password or the file key. **Keys and passwords are sensitive data, so manage the entry, display, storage, and transmission of them very carefully.**<br>

Drive passwords are the most portable, and fundamental, encryption facet, so a few options are available during private drive operations for supplying them:

#### Supplying Your Password: Environment Variable

```shell
# Securely type your password into a read prompt, store it to TMP_ARDRIVE_PW, and export it for the shell session
read -rs TMP_ARDRIVE_PW
export ARDRIVE_DRIVE_PW=$(TMP_ARDRIVE_PW)
$ ardrive <some private command> -w /path/to/wallet.json -P
```

#### Supplying Your Password: STDIN

```shell
# Pipe your drive password to the ArDrive CLI
$ cat /path/to/my/drive/password.txt | ardrive <some private command> -w /path/to/wallet.json -P

# Redirect your drive password to the ArDrive CLI
$ ardrive <some private command> -w /path/to/wallet.json -P < /path/to/my/drive/password.txt
```

#### Supplying Your Password: Prompt

```shell
# When all other options fail, the CLI will prompt for your password (NOT COMPATIBLE WITH PIPES AND REDIRECTS!)
$ ardrive <some private command> -w /path/to/wallet.json -P
? Enter drive password: › ********
```

### Creating Drives

```shell
# Public drive
$ ardrive create-drive --wallet-file /path/to/my/wallet.json --drive-name "Teenage Love Poetry"

# Private drive

```

Add a local folder to a new public drive:<br>
NOTE: To upload to the root of a drive, specify its root folder ID as the parent folder ID for the upload destiantion.

```shell
# Use `tee` to store command json outputs for later review/backup/automation/etc.
# Use `jq` to parse json output and retrieve the root folder ID for use in downstream command
ardrive create-drive -w /path/to/wallet.json -n "My Public Archive" |
tee create_drive_output.json |
jq -r '.created[] | select(.type == "folder") | .entityId' |
while read -r parentFolderId; do
ardrive upload-file -w /path/to/wallet.json --local-file-path ./myarchives -F "$parentFolderId";
done |
tee upload_folder_output.json
```

Check for network congestion before uploading:

```shell
# Arweave's transactions/block size is 1000.
# Consider waiting for less network congestion when this number is greater than 1000!
ardrive get-mempool | wc -l
```

list out the drive info to get the ar:// links
create a private drive, upload files/folders, list out the drive incl. keys
list all my drives, pick a drive and list all of its contents
show how list drive could be piped into things like...
get number of files
get size
get other cool things?
list all drives
generate a wallet or seedphrase
send ar
get balance
get keys for a drive -> warning on key security
get-mempool and checking transaction status
create a folder, upload a single file to it, move another file into that new folder
get all info for a specific file

## Getting Help

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
