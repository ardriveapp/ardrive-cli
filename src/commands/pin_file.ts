import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DestinationFileNameParameter,
	DriveIdParameter,
	DryRunParameter,
	GatewayParameter,
	ParentFolderIdParameter,
	SeedPhraseParameter,
	ShouldTurboParameter,
	SkipParameter,
	TransactionIdParameter,
	TurboUrlParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { EID, skipOnConflicts, TxID, Wallet } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'pin-file',
	parameters: [
		ParentFolderIdParameter,
		{
			name: TransactionIdParameter,
			description: `the transaction ID of the EXISTING Arweave data transaction to pin into your drive
\t\t\t\t\t\t\t• The referenced data is reused as-is and is NOT re-uploaded (free)`
		},
		{
			name: DestinationFileNameParameter,
			required: true,
			description: `the name to give the newly pinned file entity within your ArDrive drive`
		},
		{
			name: DriveIdParameter,
			required: false,
			aliases: ['--drive-id'],
			description: `(OPTIONAL) the ArFS entity ID of the destination drive
\t\t\t\t\t\t\t• When provided, must match the drive that actually owns --parent-folder-id, or the command will fail
\t\t\t\t\t\t\t• When omitted, the destination drive is resolved automatically from --parent-folder-id`
		},
		SkipParameter,
		BoostParameter,
		DryRunParameter,
		WalletFileParameter,
		SeedPhraseParameter,
		GatewayParameter,
		ShouldTurboParameter,
		TurboUrlParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());
		const useTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const turboUrl = parameters.getTurbo();

		const wallet: Wallet = await parameters.getRequiredWallet();
		const arDrive = cliArDriveFactory({
			wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: parameters.isDryRun(),
			arweave,
			turboSettings: useTurbo ? { turboUrl } : undefined
		});

		const parentFolderId = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
		const dataTxId = parameters.getRequiredParameterValue(TransactionIdParameter, TxID);
		const pinnedFileName = parameters.getRequiredParameterValue(DestinationFileNameParameter);
		const driveId = parameters.getParameterValue(DriveIdParameter, EID);

		// Pinning only distinguishes "skip on name conflict" from the default (throw on name conflict) --
		// there is no replace/upsert/interactive-ask behavior for pinned files (mirrors ArDrive.pinPublicFile,
		// which only special-cases skipOnConflicts and otherwise throws on any destination name collision).
		const conflictResolution = parameters.getParameterValue(SkipParameter) ? skipOnConflicts : undefined;

		// NOTE: ArDrive.pinPublicFile throws a clear 'Pinning is only supported for public drives' error when
		// --parent-folder-id resolves to a private drive. That Error propagates unmodified up through this
		// action and is caught/printed cleanly by CLIAction (same handling every other command relies on) --
		// no raw/uncaught stack trace reaches the user.
		const result = await arDrive.pinPublicFile({
			parentFolderId,
			dataTxId,
			pinnedFileName,
			driveId,
			conflictResolution
		});

		console.log(JSON.stringify(result, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
