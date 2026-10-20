import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DriveIdParameter,
	DriveKeyParameter,
	DrivePrivacyParameters,
	GatewayParameter
} from '../parameter_declarations';
import { cliArDriveAnonymousFactory, cliArDriveFactory, cliWalletDao } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { DriveStateProtection, DriveStateSource, EID, GatewayAPI, gatewayUrlForArweave } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

/**
 * Reports whether a drive has a usable snapshot (an ArFS Drive State entity)
 * and why not when it has none: the same verdict a listing reaches, without
 * listing anything. Reads only; spends nothing.
 */
new CLICommand({
	name: 'snapshot-info',
	parameters: [DriveIdParameter, ...DrivePrivacyParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const arweave = getArweaveFromURL(parameters.getGateway());
		const driveId = EID(parameters.getRequiredParameterValue(DriveIdParameter));

		let protection: DriveStateProtection;
		let owner;
		const driveKeyParameter = parameters.getParameterValue(DriveKeyParameter);
		if (driveKeyParameter) {
			// The key itself is all reading needs: no wallet, no password.
			owner = await cliArDriveAnonymousFactory({ arweave }).getOwnerForDriveId(driveId);
			protection = { kind: 'private', driveKey: Buffer.from(driveKeyParameter, 'base64') };
		} else if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = cliArDriveFactory({ wallet, arweave });
			owner = await arDrive.getOwnerForDriveId(driveId);
			const driveKey = await parameters.getDriveKey({ driveId, arDrive, owner });
			protection = { kind: 'private', driveKey: driveKey.keyData };
		} else {
			owner = await cliArDriveAnonymousFactory({ arweave }).getOwnerForDriveId(driveId);
			protection = { kind: 'public' };
		}

		const source = new DriveStateSource({
			gatewayApi: new GatewayAPI({ gatewayUrl: gatewayUrlForArweave(arweave) }),
			log: (line) => console.error(line),
			// As a listing does, so this reports the verdict a listing would reach.
			currentHeight: async () => (await arweave.network.getInfo()).height
		});
		const result = await source.read({ driveId, owner, protection });

		console.log(
			JSON.stringify(
				{
					driveId: `${driveId}`,
					owner: `${owner}`,
					outcome: result.outcome,
					detail: result.detail,
					discoveryFailed: result.discoveryFailed ?? false,
					txId: result.txId,
					attempts: result.attempts,
					stateVersion: result.contents?.version,
					blockEnd: result.contents?.blockEnd,
					entityCount: result.contents?.entityCount,
					folders: result.contents?.folders.length,
					files: result.contents?.files.length,
					unconfirmedTransactions: result.contents?.unconfirmed.size,
					producer: result.contents?.producer
				},
				null,
				4
			)
		);
		return SUCCESS_EXIT_CODE;
	})
});
