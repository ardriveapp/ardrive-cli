import { sep } from 'path';
import {
  getLocalWallet,
  createArDriveWallet,
  getAllMyArDriveIds,
  checkOrCreateFolder,
  backupWallet,
} from 'ardrive-core-js';
import { ArDriveUser, UploadBatch } from 'ardrive-core-js/lib/types';

const prompt = require ('prompt-sync')({sigint: true});
import passwordPrompt from 'prompts';
const { v4: uuidv4 } = require('uuid');

// Get path to local wallet and return that wallet public and private key
const promptForLocalWallet = async () => {
  console.log(
    'Please enter the path of your existing Arweave Wallet JSON file eg. C:\\Source\\ardrive_test_key.json'
  );
  const existingWalletPath = prompt('Wallet Path: ');
  return getLocalWallet(existingWalletPath);
};

// Get the ArDrive owner nickname
export const promptForLogin = async () => {
  console.log('Please enter your ArDrive Login Name.  If no name exists, we will create a new ArDrive for you.');
  const login = prompt('Login Name: ');
  return login;
};

// Get the ArDrive owner nickname
const promptForArDriveId = async (uniqueArDriveIds: any) : Promise<string> => {
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
    return "New";
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
// Will handle error checking and ensuring it is a valid path
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
  return newLoginPasswordResponse.password;
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
  return dataProtectionKeyResponse.password;
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

// Prompts the user to enter a login password
const promptForLoginPassword = async () => {
  const loginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: 'Please enter your ArDrive Login password: ',
  });
  return loginPasswordResponse.password;
};

// Collects all of the information needed to create a new user
// This includes Wallet, Existing ArDrives and Sync Folder Path
const promptForNewUserInfo = async (login: string) => {
  let wallet;
  let user: ArDriveUser = {
    login: "",
    privateArDriveId: "0",
    privateArDriveTx: "0",
    publicArDriveId: "0",
    publicArDriveTx: "0",
    dataProtectionKey: "",
    walletPrivateKey: "",
    walletPublicKey: "",
    syncFolderPath: "",
  }
  try {
    const existingWallet = await promptForWallet();
    if (existingWallet === 'N') {
      wallet = await createArDriveWallet();
      const backupWalletPath = await promptForBackupWalletPath();
      await backupWallet(backupWalletPath, wallet, login);
    } else {
      wallet = await promptForLocalWallet();
    }

    user.walletPrivateKey = wallet.walletPrivateKey;
    user.walletPublicKey = wallet.walletPublicKey;

    // Load existing ArDrives
    const uniqueArDriveIds = await getAllMyArDriveIds(wallet.walletPublicKey);
    if (uniqueArDriveIds.length > 0) {
      user.privateArDriveId = await promptForArDriveId(uniqueArDriveIds);
      user.publicArDriveId = user.privateArDriveId // NEED TO FIX THIS AS THE ABOVE FUNCTION DOES NOT FULLY WORK WITH PUBLIC/PRIVATE DRIVEIDs
    } else {
      user.privateArDriveId = uuidv4();
      user.publicArDriveId = uuidv4();
    }
    user.syncFolderPath = await promptForSyncFolderPath();
    user.dataProtectionKey = await promptForDataProtectionKey();
    return user;
  } catch (err) {
    console.log(err);
    return user;
  }
};

// Asks the user to approve an upload to Arweave
const promptForArDriveUpload = async (uploadBatch: UploadBatch) => {
  console.log(
    'Uploading %s files, %s folders and %s changes (%s) to the Permaweb, totaling %s AR',
    uploadBatch.totalNumberOfFileUploads,
    uploadBatch.totalNumberOfFolderUploads,
    uploadBatch.totalNumberOfMetaDataUploads,
    uploadBatch.totalSize,
    uploadBatch.totalArDrivePrice
  );
  const readyToUpload = prompt('Upload all unsynced files? Y/N ');
  return readyToUpload;
};

// Prompt the user if they want to rename, overwrite or ignore file conflict
const promptForFileOverwrite = async (fullPath: any) => {
  console.log(
    'A file has been found on the Permaweb with a different hash but the same file name %s',
    fullPath
  );
  const conflict = prompt(
    'Would you like to Overwrite (O) Rename (R) or Ignore (I): '
  );
  return conflict;
};

export { promptForArDriveUpload, promptForFileOverwrite, promptForNewUserInfo, promptForNewLoginPassword, promptForLoginPassword }