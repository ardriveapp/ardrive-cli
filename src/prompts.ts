import promptSync from 'prompt-sync';
import passwordPrompt from 'prompts';
import { sep } from 'path';
import {
  getLocalWallet,
  createArDriveWallet,
  getAllMyArDriveIds,
} from '../../app/backend/arweave';
import { checkOrCreateFolder, backupWallet } from '../../app/backend/common';
import { setUser, getUser } from '../../app/backend/profile';

const prompt = promptSync({ sigint: true });
const uuidv4 = require('uuid/v4');

// Get path to local wallet and return that wallet public and private key
const promptForLocalWallet = async () => {
  console.log(
    'Please enter the path of your existing Arweave Wallet JSON file eg. C:\\Source\\ardrive_test_key.json'
  );
  const existingWalletPath = prompt('Wallet Path: ');
  return getLocalWallet(existingWalletPath);
};

// Get the ArDrive owner nickname
const promptForNickname = async () => {
  console.log('What is the nickname you would like to give to this wallet?');
  const owner = prompt('Please enter your nickname: ');
  return owner;
};

// Get the ArDrive owner nickname
const promptForArDriveId = async (uniqueArDriveIds: any) => {
  console.log(
    'Existing ArDrive IDs have been found for this wallet.  Which one would you like to use?'
  );
  let i = 0;
  uniqueArDriveIds.forEach((uniqueArDriveId: any) => {
    console.log('%s: %s', i, uniqueArDriveId);
    i += 1;
  });
  console.log('%s: Generate a new ArDrive ID', i);
  const choice = prompt('Please select which number: ');
  if (+choice === i) {
    return uuidv4();
  }
  return uniqueArDriveIds[choice];
};

// Get the location to backup the new wallet
const promptForBackupWalletPath = (): string => {
  console.log(
    'Please enter the path to backup your new ArDrive Wallet e.g C:\\My_Safe_Location'
  );
  console.log('Your ArDrive Wallet is the key to open all your ArDrive data.');
  console.log('        Do NOT share it!');
  console.log('        Do NOT lose it!');
  console.log('        Do NOT save it on cloud storage.');
  console.log('        Do NOT save it on your ArDrive');
  const backupFolderPath = prompt(
    'ArDrive Wallet Backup Folder Path: ',
    process.cwd().concat(sep, 'Backup', sep)
  );
  const validPath = checkOrCreateFolder(backupFolderPath);
  if (validPath === '0') {
    return promptForBackupWalletPath();
  }
  return backupFolderPath;
};

// Get the ArDrive Sync Folder path
const promptForSyncFolderPath = (): string => {
  // Setup ArDrive Sync Folder
  console.log(
    'Please enter the path of your local ArDrive folder e.g D:\\ArDriveSync.  A new folder will be created if it does not exist'
  );
  const syncFolderPath = prompt(
    'ArDrive Sync Folder Path: ',
    process.cwd().concat(sep, 'Sync', sep)
  );

  const validPath = checkOrCreateFolder(syncFolderPath);
  if (validPath === '0') {
    return promptForSyncFolderPath();
  }
  return syncFolderPath;
};

// Setup ArDrive Login Password
// Modify to check for password strength
const promptForNewLoginPassword = async () => {
  console.log(
    'Your ArDrive Login password will be used to unlock your ArDrive and start syncing.'
  );
  const newLoginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: 'Please enter a strong ArDrive Login password: ',
  });
  return newLoginPasswordResponse;
};

// Setup ArDrive Data Protection Password
// TO DO Modify to check for password strength
const promptForDataProtectionKey = async () => {
  console.log(
    'Your ArDrive Data Protection password will be used to encrypt your data on the Permaweb.  Do NOT lose this!!!'
  );
  const dataProtectionKeyResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: 'Please enter a strong ArDrive Encryption password: ',
  });
  return dataProtectionKeyResponse;
};

// Get the users wallet or create a new one
const promptForWallet = async () => {
  // Create new or import Arweave wallet
  console.log('To use ArDrive, you must have an Arweave Wallet.');
  const existingWallet = prompt(
    'Do you have an existing Arweave Wallet (.json file) Y/N '
  );
  return existingWallet;
};

const promptForLoginPassword = async () => {
  const loginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: 'Please enter your ArDrive Login password: ',
  });
  return loginPasswordResponse.password;
};

export const setupAndGetUser = async () => {
  try {
    // Welcome message and info
    console.log(
      'We have not detected a profile.  To store your files permanently, you must first setup your ArDrive account.'
    );

    let wallet;
    const owner = await promptForNickname(); // Must replace with Arweave ID

    const existingWallet = await promptForWallet();
    if (existingWallet === 'N') {
      wallet = await createArDriveWallet();
      const backupWalletPath = await promptForBackupWalletPath();
      await backupWallet(backupWalletPath, wallet, owner);
    } else {
      wallet = await promptForLocalWallet();
    }

    const uniqueArDriveIds = await getAllMyArDriveIds(wallet.walletPublicKey);
    let arDriveId: string;
    if (uniqueArDriveIds.length > 0) {
      arDriveId = await promptForArDriveId(uniqueArDriveIds);
    } else {
      arDriveId = uuidv4();
    }
    const syncFolderPath = await promptForSyncFolderPath();
    const newLoginPasswordResponse = await promptForNewLoginPassword();
    const dataProtectionKeyResponse = await promptForDataProtectionKey();

    const user = await setUser(
      owner,
      arDriveId,
      syncFolderPath,
      wallet.walletPrivateKey,
      wallet.walletPublicKey,
      newLoginPasswordResponse.password,
      dataProtectionKeyResponse.password
    );

    return user;
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const userLogin = async (walletPublicKey, owner) => {
  console.log('An ArDrive Wallet is present for: %s', owner);
  const loginPassword = await promptForLoginPassword();
  const user = await getUser(walletPublicKey, loginPassword);
  return user;
};

export const promptForArDriveUpload = async (
  price,
  size,
  amountOfFiles,
  amountOfMetaData,
  amountOfFolders
) => {
  console.log(
    'Uploading %s files, %s folders and %s changes (%s) to the Permaweb, totaling %s AR',
    amountOfFiles,
    amountOfFolders,
    amountOfMetaData,
    size,
    price
  );
  const readyToUpload = prompt('Upload all unsynced files? Y/N ');
  return readyToUpload;
};

// Prompt the user if they want to rename, overwrite or ignore file conflict
export const promptForFileOverwrite = async (fullPath) => {
  console.log(
    'A file has been found on the Permaweb with a different hash but the same file name %s',
    fullPath
  );
  const conflict = prompt(
    'Would you like to Overwrite (O) Rename (R) or Ignore (I): '
  );
  return conflict;
};
