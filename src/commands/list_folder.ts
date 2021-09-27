/* eslint-disable no-console */
import { cliArweave, cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import {
	ArFSDAO,
	ArFSDAOAnonymous,
	ArFSPrivateFileOrFolderData,
	ArFSPublicFileOrFolderData,
	FolderHierarchy
} from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import { ArDriveCommunityOracle } from '../community/ardrive_community_oracle';
import { ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

new CLICommand({
	name: 'list-folder',
	parameters: [ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const wallet = await context.getWallet().catch(() => null);
		const folderId = context.getParameterValue(ParentFolderIdParameter);
		let folder;
		let mergedData: (ArFSPrivateFileOrFolderData | ArFSPublicFileOrFolderData)[];

		if (!folderId) {
			console.log(`Folder id not specified! ${folderId}`);
			process.exit(1);
		}

		if (wallet) {
			const arDrive = new ArDrive(
				wallet,
				cliWalletDao,
				new ArFSDAO(wallet, cliArweave),
				new ArDriveCommunityOracle(cliArweave),
				CLI_APP_NAME,
				CLI_APP_VERSION
			);
			// Fetch the folder to extract the drive
			folder = await arDrive.getPrivateFolder(folderId);

			// Fetch all of the folder entities within the drive
			const driveIdOfFolder = folder.driveId;
			const allFolderEntitiesOfDrive = await arDrive.getAllFoldersOfPrivateDrive(driveIdOfFolder);

			// Feed entities to FolderHierarchy.setupNodesWithEntity()
			const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
			const folderIDs = hierarchy.allFolderIDs();

			// Fetch all file entities within all Folders of the drive
			const allFileEntitiesOfDrive = await arDrive.getPrivateChildrenFilesFromFolderIDs(folderIDs);

			// Fetch all names of each entity
			const allEntitiesOfDrive = [...allFolderEntitiesOfDrive, ...allFileEntitiesOfDrive].sort(
				(a, b) => +a.txId - +b.txId
			);

			mergedData = allEntitiesOfDrive.map((entity) => {
				const path = `${
					entity.parentFolderId !== 'root folder' ? hierarchy.pathToFolderId(entity.parentFolderId) : ''
				}/${entity.name}`;
				const txPath = `${
					entity.parentFolderId !== 'root folder' ? hierarchy.txPathToFolderId(entity.parentFolderId) : ''
				}/${entity.txId}`;
				const entityIdPath = `${
					entity.parentFolderId !== 'root folder' ? hierarchy.entityPathToFolderId(entity.parentFolderId) : ''
				}/${entity.entityId}`;
				return new ArFSPrivateFileOrFolderData(
					entity.appName,
					entity.appVersion,
					entity.arFS,
					entity.contentType,
					entity.driveId,
					entity.entityType,
					entity.name,
					entity.txId,
					entity.unixTime,
					entity.parentFolderId,
					entity.entityId,
					entity.cipher,
					entity.cipherIV,
					path,
					txPath,
					entityIdPath
				);
			});
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			folder = await arDrive.getPublicFolder(folderId);

			// Fetch all of the folder entities within the drive
			const driveIdOfFolder = folder.driveId;
			const allFolderEntitiesOfDrive = await arDrive.getAllFoldersOfPublicDrive(driveIdOfFolder);

			// Feed entities to FolderHierarchy.setupNodesWithEntity()
			const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
			const folderIDs = hierarchy.allFolderIDs();

			// Fetch all file entities within all Folders of the drive
			const allFileEntitiesOfDrive = await arDrive.getPublicChildrenFilesFromFolderIDs(folderIDs);

			// Fetch all names of each entity
			const allEntitiesOfDrive = [...allFolderEntitiesOfDrive, ...allFileEntitiesOfDrive].sort(
				(a, b) => +a.txId - +b.txId
			);

			mergedData = allEntitiesOfDrive.map((entity) => {
				const path = `${
					entity.parentFolderId !== 'root folder' ? hierarchy.pathToFolderId(entity.parentFolderId) : ''
				}/${entity.name}`;
				const txPath = `${
					entity.parentFolderId !== 'root folder' ? hierarchy.txPathToFolderId(entity.parentFolderId) : ''
				}/${entity.txId}`;
				const entityIdPath = `${
					entity.parentFolderId !== 'root folder' ? hierarchy.entityPathToFolderId(entity.parentFolderId) : ''
				}/${entity.entityId}`;
				return new ArFSPublicFileOrFolderData(
					entity.appName,
					entity.appVersion,
					entity.arFS,
					entity.contentType,
					entity.driveId,
					entity.entityType,
					entity.name,
					entity.txId,
					entity.unixTime,
					entity.parentFolderId,
					entity.entityId,
					path,
					txPath,
					entityIdPath
				);
			});
		}

		// Display data
		console.log(JSON.stringify(mergedData, null, 4));
		process.exit(0);
	}
});
