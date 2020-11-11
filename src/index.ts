#!/usr/bin/env node
/* eslint-disable no-await-in-loop */
// index.ts
import {
  setupDatabase,
  getUserFromProfile,
  getMyFileDownloadConflicts,
  getWalletBalance,
  sleep,
  checkUploadStatus,
  uploadArDriveFiles,
  getPriceOfNextUploadBatch,
  getMyArDriveFilesFromPermaWeb,
  downloadMyArDriveFiles,
  startWatchingFolders,
  resolveFileDownloadConflict,
  getUser,
  addNewUser,
  passwordCheck,
  setupDrives,
  setProfileAutoSyncApproval,
  //addSharedPublicDrive,
} from 'ardrive-core-js'
import { ArDriveUser, UploadBatch } from 'ardrive-core-js/lib/types';
import {
  promptForLoginPassword,
  promptForNewUserInfo,
  promptForArDriveUpload,
  promptForFileOverwrite,
  promptForLogin,
  promptToAddSharedPublicDrive,
  promptToAddOrCreatePersonalPrivateDrive,
  promptToAddOrCreatePersonalPublicDrive,
  promptForAutoSyncApproval,
  promptToRemoveDrive,
} from './prompts';

async function main() {
  // Setup database if it doesnt exist
  try {
    await setupDatabase('./.ardrive-cli.db');
  } catch (err) {
    console.error(err);
    return;
  }
  let user: ArDriveUser = {
    login: "",
    dataProtectionKey: "",
    walletPrivateKey: "",
    walletPublicKey: "",
    syncFolderPath: "",
    autoSyncApproval: 0,
  } 
  let fileDownloadConflicts;

  // Ask the user for their login name
  const login = await promptForLogin();

  // Check to see if it exists
  user = await getUserFromProfile(login);

  // If no user is found, prompt the user to create a new one
  if (user === undefined)
  {
    // Welcome message and info
    console.log('We have not detected a profile for your login!  Let\'s get one set up.');
    user = await promptForNewUserInfo(login);
    const loginPassword = user.dataProtectionKey;
    await addNewUser(user.dataProtectionKey, user);
    user = await getUser(loginPassword, login);
  }
 else {
    // Allow the user to login
    console.log('You already have an existing ArDrive', login);
    const loginPassword = await promptForLoginPassword();
    const passwordResult: boolean = await passwordCheck(loginPassword, login)
    if (passwordResult) {
      user = await getUser(loginPassword, login);
      console.log ("Before we get syncing...")

      // Allow the user to add other drives
      await promptToAddOrCreatePersonalPrivateDrive(user);
      await promptToAddOrCreatePersonalPublicDrive(user);
      await promptToAddSharedPublicDrive(user);

      // Allow the user to remove a shared, public or private drive
      await promptToRemoveDrive(user.login);
      
      // Allow the user to change the auto approve setting
      user.autoSyncApproval = await promptForAutoSyncApproval()
      await setProfileAutoSyncApproval(user.autoSyncApproval, user.login)
    }
    else {
      console.log ("You have entered a bad password for this ArDrive... Goodbye");
      return 0;
    }
  }

  // Initialize Drives
  await setupDrives(user.login, user.syncFolderPath);

  // Get all of the public and private files for the user and store in the local database before starting folder watcher
  await getMyArDriveFilesFromPermaWeb(user);

  // Download any files from Arweave that need to be synchronized locally
  await downloadMyArDriveFiles(user);

  // Initialize Chokidar Folder Watcher by providing the Sync Folder Path, Private and Public ArDrive IDs
  startWatchingFolders(user)
  
  // watchFolder(user.syncFolderPath);

  // Continually check for things to process and actions to notify the user
  while (true) {

    // Get all of the public and private files for the user and store in the local database
    await getMyArDriveFilesFromPermaWeb(user);

    // Download any files from Arweave that need to be synchronized locally
    await downloadMyArDriveFiles(user);

    // Check the status of any files that may have been already been uploaded
    await checkUploadStatus(user.login);

    // Figure out the cost of the next batch of uploads, and ask the user if they want to approve
    const uploadBatch: UploadBatch = await getPriceOfNextUploadBatch(user.login);
    if (uploadBatch.totalArDrivePrice !== 0) {
      if (await promptForArDriveUpload(uploadBatch, user.autoSyncApproval)) {
        await uploadArDriveFiles(user);
      }
    }

    // Resolve and download conflicts, and process on the next batch
    fileDownloadConflicts = await getMyFileDownloadConflicts(user.login);
    if (fileDownloadConflicts) {
      fileDownloadConflicts.forEach(async (fileDownloadConflict: any) => {
        const response = await promptForFileOverwrite(
          fileDownloadConflict.fullPath
        );
        await resolveFileDownloadConflict(
          response,
          fileDownloadConflict.fileName,
          fileDownloadConflict.filePath,
          fileDownloadConflict.id
        );
      });
    }

    // Update date
    const today = new Date();
    const date = `${today.getFullYear()}-${
      today.getMonth() + 1
    }-${today.getDate()}`;
    const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
    const dateTime = `${date} ${time}`;

    // Get the latest balance of the loaded wallet.
    const balance = await getWalletBalance(user.walletPublicKey);
    console.log(
      '%s Syncronization completed.  Current AR Balance: %s',
      dateTime,
      balance
    );
    await sleep(10000);
  }
}

function displayBanner() {
  
console.log("                          █████╗ ██████╗ ██████╗ ██████╗ ██╗██╗   ██╗███████╗");
console.log("                         ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║██║   ██║██╔════╝");
console.log("                         ███████║██████╔╝██║  ██║██████╔╝██║██║   ██║█████╗  ");
console.log("                         ██╔══██║██╔══██╗██║  ██║██╔══██╗██║╚██╗ ██╔╝██╔══╝  ");
console.log("                         ██║  ██║██║  ██║██████╔╝██║  ██║██║ ╚████╔╝ ███████╗");
console.log("                         ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝");
console.log("                                                                             ");
console.log("                                 ██████╗ ███████╗████████╗ █████╗            ");
console.log("                                 ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗           ");
console.log("                                 ██████╔╝█████╗     ██║   ███████║           ");
console.log("                                 ██╔══██╗██╔══╝     ██║   ██╔══██║           ");
console.log("                                 ██████╔╝███████╗   ██║   ██║  ██║           ");
console.log("                                 ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝           ");
console.log("");                                                   

}
displayBanner();
main();
