import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	ConflictResolutionParams,
	DestinationFileNameParameter,
	DryRunParameter,
	ParentFolderIdParameter,
	LocalPathParameter,
	GatewayParameter,
	CustomContentTypeParameter,
	TransactionIdParameter,
	FileIdParameter,
	WalletTypeParameters
} from '../parameter_declarations';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { wrapFileOrFolder, EID, TxID } from 'ardrive-core-js';
import { cliArDriveFactory } from '..';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'retry-tx',
	parameters: [
		LocalPathParameter,
		{ name: ParentFolderIdParameter, required: false },
		{ name: FileIdParameter, required: false },
		DestinationFileNameParameter,
		BoostParameter,
		DryRunParameter,
		...ConflictResolutionParams,
		CustomContentTypeParameter,
		GatewayParameter,
		{
			name: TransactionIdParameter,
			description: '(PUBLIC UNBUNDLED FILES ONLY) The transaction ID of the data transaction to retry'
		},
		...WalletTypeParameters
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const conflictResolution = parameters.getFileNameConflictResolution();
		const customContentType = parameters.getParameterValue(CustomContentTypeParameter);
		const localFilePath = parameters.getRequiredParameterValue<string>(LocalPathParameter);

		const dataTxId = parameters.getRequiredParameterValue(TransactionIdParameter, TxID);
		const wrappedFile = wrapFileOrFolder(localFilePath, customContentType);

		if (wrappedFile.entityType !== 'file') {
			throw Error('Retrying folder uploads is not yet supported!');
		}

		const wallet = await parameters.getRequiredWallet();
		const arweave = getArweaveFromURL(parameters.getGateway());

		const arDrive = cliArDriveFactory({
			wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: parameters.isDryRun(),
			arweave
		});

		const destinationFolderId = parameters.getParameterValue(ParentFolderIdParameter, EID);
		const fileId = parameters.getParameterValue(FileIdParameter, EID);

		const results = await (async () => {
			if (fileId) {
				return arDrive.retryPublicArFSFileUploadByFileId({
					wrappedFile,
					dataTxId,
					fileId
				});
			}

			if (destinationFolderId) {
				return arDrive.retryPublicArFSFileUploadByDestFolderId({
					wrappedFile,
					dataTxId,
					destinationFolderId,
					conflictResolution
				});
			}

			throw Error('Must provide a file ID or destination folder ID in order to retry and ArFS file transaction');
		})();

		console.log(JSON.stringify(results, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
