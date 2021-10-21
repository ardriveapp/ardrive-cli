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

## Intended Audience

This tool is intended for use by:

<ul>
<li>ArDrive power users with advanced workflows and resource efficiency in mind</li>
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

### NVM

This repository uses NVM and an `.nvmrc` file to lock the Node version to the current version used by `ardrive-core-js`.

**Note for Windows: We recommend using WSL for setting up NVM on Windows using the [instructions described here][wsl-install]**

Follow these steps to get NVM up and running on your system:

1. Install NVM using [these installation instructions][nvm-install].
2. Navigate to this project's root directory
3. Ensure that the correct version of Node is installed by performing: `nvm install`
4. Use the correct version of Node, by performing: `nvm use`

### Using a custom ArDrive-Core-JS

To test a with a custom version of the `ardrive-core-js` library on your local system, change the `"ardrive-core-js"` line in `package.json` to the root of your local `ardrive-core-js` repo:

```diff
- "ardrive-core-js": "1.0.0"
+ "ardrive-core-js": "../ardrive-core-js/"
```

### Installing and Starting the CLI

Now that everything is set up, to install the package simply run:

```shell
yarn
```

And then start the CLI:

```shell
yarn start
```

### Recommended Visual Studio Code extensions

To ensure your environment is compatible, we also recommend the following VSCode extensions:

-   [ES-Lint][eslint-vscode]
-   [Editor-Config][editor-config-vscode]
-   [Prettier][prettier-vscode]
-   [ZipFS][zipfs-vscode]

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
