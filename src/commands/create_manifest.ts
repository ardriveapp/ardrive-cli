import { EID } from 'ardrive-core-js';
import { cliArDriveFactory, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	BoostParameter,
	FolderIdParameter,
	DryRunParameter,
	SeedPhraseParameter,
	TreeDepthParams,
	WalletFileParameter,
	DestinationManifestNameParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'create-manifest',
	parameters: [
		FolderIdParameter,
		DestinationManifestNameParameter,
		BoostParameter,
		DryRunParameter,
		WalletFileParameter,
		SeedPhraseParameter,
		...TreeDepthParams
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);

		const wallet = await parameters.getRequiredWallet();

		const arDrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: !!options.dryRun
		});

		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);

		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const destManifestName = parameters.getParameterValue(DestinationManifestNameParameter);

		const result = await arDrive.uploadPublicManifest({
			folderId: folderId,
			maxDepth,
			destManifestName
		});

		console.log(JSON.stringify(result, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
