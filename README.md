# ardrive-cli

The _ArDrive Command Line Interface (CLI)_ is a Node.js application for terminal-based [ArDrive] workflows. It also offers utility operations for securely interacting with Arweave wallets and inspecting various [Arweave] blockchain conditions.

Create your first drive and permanently store your first file on the permaweb with a series of simple CLI commands like so:

```
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

## CLI Examples

Learn to use any command:

```shell
ardrive --help
```

Add a local folder to a new public drive:<br>
NOTE: To upload to the root of a drive, specify its root folder ID as the parent folder ID for the upload destiantion.

```shell
# Use tee to store command json outputs for later review/backup/automation/etc.
# Use jq to parse output json and retrieve the root folder ID
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

## Limitations

**Number of files in a bulk upload:** Theoretically unlimited<br>
**Max individual file size**: 2GB (Node.js limitation)<br>
**Max ANS-104 bundled transaction size:** Not yet implemented. 2GB per bundle. App will handle creating multiple bundles.<br>
**Max ANS-104 data item counts per bundled transaction:** Not yet implemented. Also not adequately specified, though a very large number of data items per bundle is associated with increased rates of GQL indexing failure.

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
