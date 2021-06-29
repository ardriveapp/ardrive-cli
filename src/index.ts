#!/usr/bin/env node
/* eslint-disable no-await-in-loop */
// index.ts
import * as ardrive from 'ardrive-core-js';
import { ArDriveUser, IDriveUser } from 'ardrive-core-js';
import * as cli from './prompts';

async function main() {
	// Setup database if it doesnt exist
	try {
		await ardrive.setupDatabase('./.ardrive-cli.db');
	} catch (err) {
		console.error(err);
		return;
	}
	let fileDownloadConflicts: ardrive.ArFSFileMetaData[] = [];

	// Ask the user for their login name
	const login = await cli.promptForLogin();

	// Check to see if it exists
	let userData: IDriveUser = await ardrive.getUserFromProfile(login);
	let user: ArDriveUser;

	// If no user is found, prompt the user to create a new one
	if (userData === undefined) {
		// Welcome message and info
		console.log("We have not detected a profile for your login!  Let's get one set up.");
		userData = await cli.promptForNewUserInfo(login);
		user = new ardrive.ArDriveUser(userData);
		const loginPassword = user.dataProtectionKey;
		await ardrive.addNewUser(user.dataProtectionKey, user);
		user = await ardrive.getUser(loginPassword, login);
	} else {
		// Allow the user to login
		console.log('You already have an existing ArDrive', login);
		const loginPassword = await cli.promptForLoginPassword();
		const passwordResult: boolean = await ardrive.passwordCheck(loginPassword, login);
		if (passwordResult) {
			user = await ardrive.getUser(loginPassword, login);
			console.log('Before we get syncing...');

			// Allow the user to add other drives
			await cli.promptToAddOrCreatePersonalPrivateDrive(user);
			await cli.promptToAddOrCreatePersonalPublicDrive(user);
			await cli.promptToAddSharedPublicDrive(user);

			// Allow the user to change sync location
			const newSyncFolderPath: string = await cli.promptToChangeSyncFolderPath(user.syncFolderPath);
			if (newSyncFolderPath != 'Skipped') {
				console.log('Updating to new sync folder path ', newSyncFolderPath);
				const result = await ardrive.updateUserSyncFolderPath(user.login, newSyncFolderPath);
				if (result === 'Success') {
					console.log('Successfully moved Sync folder path to %s', newSyncFolderPath);

					// Update current user object
					user.syncFolderPath = newSyncFolderPath;
				} else {
					console.log('Error moving Sync folder path.  Continuing to use %s', user.syncFolderPath);
				}
			}

			// Allow the user to remove a shared, public or private drive
			await cli.promptToRemoveDrive(user.login);

			// Allow the user to change the auto approve setting
			user.autoSyncApproval = await cli.promptForAutoSyncApproval();
			await ardrive.setProfileAutoSyncApproval(user.autoSyncApproval, user.login);
		} else {
			console.log('You have entered a bad password for this ArDrive... Goodbye');
			return 0;
		}
	}

	// Initialize Drives
	await ardrive.setupDrives(user.login, user.syncFolderPath);

	// Get all of the public and private files for the user and store in the local database before starting folder watcher
	await ardrive.getMyArDriveFilesFromPermaWeb(user);

	// Download any files from Arweave that need to be synchronized locally
	await ardrive.downloadMyArDriveFiles(user);

	// Get latest wallet balance
	const balance = await ardrive.getWalletBalance(user.walletPublicKey);
	await ardrive.setProfileWalletBalance(+balance, login);

	// Initialize Chokidar Folder Watcher by providing the Sync Folder Path, Private and Public ArDrive IDs
	ardrive.startWatchingFolders(user);

	// Continually check for things to process and actions to notify the user
	let loop = true;
	while (loop === true) {
		try {
			// Get all of the latest personal public and private drives for the user, and store in the local database
			await ardrive.getAllMyPersonalDrives(user);

			// Get all of the public and private files for the user and store in the local database
			await ardrive.getMyArDriveFilesFromPermaWeb(user);

			// Download any files from Arweave that need to be synchronized locally
			await ardrive.downloadMyArDriveFiles(user);

			// Check the status of any files that may have been already been uploaded
			await ardrive.checkUploadStatus(user.login);

			// Figure out the cost of the next batch of uploads, and ask the user if they want to approve
			// If the size is -1, then the user does not have enough funds and the upload is skipped
			const uploadBatch: ardrive.UploadBatch = await ardrive.getPriceOfNextUploadBatch(user.login);
			if (uploadBatch.totalArDrivePrice > 0) {
				if (await cli.promptForArDriveUpload(login, uploadBatch, user.autoSyncApproval)) {
					await ardrive.uploadArDriveFiles(user);
				}
			}

			// Resolve and download conflicts, and process on the next batch
			fileDownloadConflicts = await ardrive.getMyFileDownloadConflicts(user.login);
			if (fileDownloadConflicts) {
				fileDownloadConflicts.forEach(async (conflict: ardrive.IFileMetaData) => {
					const fileDownloadConflict = new ardrive.ArFSFileMetaData(conflict);
					const response = await cli.promptForFileOverwrite(fileDownloadConflict.filePath);
					await ardrive.resolveFileDownloadConflict(
						response,
						fileDownloadConflict.fileName,
						fileDownloadConflict.filePath,
						fileDownloadConflict.id.toString()
					);
				});
			}

			// Update date
			const today = new Date();
			const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
			const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
			const dateTime = `${date} ${time}`;

			// Get the latest balance of the loaded wallet.
			const balance = await ardrive.getWalletBalance(user.walletPublicKey);
			await ardrive.setProfileWalletBalance(+balance, login);
			console.log('%s Syncronization completed.  Current AR Balance: %s', dateTime, balance);
			await ardrive.sleep(30000);
		} catch (err) {
			console.log(err);
			loop = false;
		}
	}
	return 0;
}

function displayBanner() {
	console.log('                          █████╗ ██████╗ ██████╗ ██████╗ ██╗██╗   ██╗███████╗');
	console.log('                         ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║██║   ██║██╔════╝');
	console.log('                         ███████║██████╔╝██║  ██║██████╔╝██║██║   ██║█████╗  ');
	console.log('                         ██╔══██║██╔══██╗██║  ██║██╔══██╗██║╚██╗ ██╔╝██╔══╝  ');
	console.log('                         ██║  ██║██║  ██║██████╔╝██║  ██║██║ ╚████╔╝ ███████╗');
	console.log('                         ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝');
	console.log('                                                                             ');
	console.log('                                 ██████╗ ███████╗████████╗ █████╗            ');
	console.log('                                 ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗           ');
	console.log('                                 ██████╔╝█████╗     ██║   ███████║           ');
	console.log('                                 ██╔══██╗██╔══╝     ██║   ██╔══██║           ');
	console.log('                                 ██████╔╝███████╗   ██║   ██║  ██║           ');
	console.log('                                 ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝           ');
	console.log('');
}
displayBanner();
main();
