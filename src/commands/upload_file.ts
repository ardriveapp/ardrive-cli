import { GatewayOracle } from 'ardrive-core-js';
import { arDriveFactory } from '..';
import { CLICommand } from '../CLICommand';
import {
	BoostParameter,
	DestinationFileNameParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	DryRunParameter,
	LocalFilePathParameter,
	LocalFilesParameter,
	ParentFolderIdParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { FeeMultiple } from '../types';
import { readJWKFile } from '../utils';
import { ARDataPriceEstimator } from '../utils/ar_data_price_estimator';
import { ARDataPriceOracleEstimator } from '../utils/ar_data_price_oracle_estimator';
import { ARDataPriceRegressionEstimator } from '../utils/ar_data_price_regression_estimator';

/* eslint-disable no-console */

interface UploadFileParameter {
	parentFolderId: string;
	localFilePath: string;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: string;
}

new CLICommand({
	name: 'upload-file',
	parameters: [
		ParentFolderIdParameter,
		LocalFilePathParameter,
		DestinationFileNameParameter,
		LocalFilesParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter,
		BoostParameter,
		DryRunParameter
	],
	async action(options) {
		const filesToUpload: UploadFileParameter[] = (function (): UploadFileParameter[] {
			if (options.drivePassword && options.driveKey) {
				console.log(`Can not use --drive-password in conjunction with --drive-key`);
				process.exit(1);
			}
			if (options.localFiles) {
				if (options.localFilePath) {
					console.log(`Can not use --local-files in conjunction with --localFilePath`);
					process.exit(1);
				}
				const COLUMN_SEPARATOR = ',';
				const ROW_SEPARATOR = '.';
				const csvRows = options.localFiles.split(ROW_SEPARATOR);
				const fileParameters: UploadFileParameter[] = csvRows.map((row: string) => {
					const csvFields = row.split(COLUMN_SEPARATOR).map((f: string) => f.trim());
					const [parentFolderId, localFilePath, destinationFileName, drivePassword, driveKey] = csvFields;
					return {
						parentFolderId,
						localFilePath,
						destinationFileName,
						drivePassword,
						driveKey
					};
				});
				return fileParameters;
			}
			const singleParameter = {
				parentFolderId: options.parentFolderId,
				localFilePath: options.localFilePath,
				destinationFileName: options.destFileName,
				drivePassword: options.drivePassword,
				driveKey: options.driveKey
			};
			if (!options.parentFolderId || !options.localFilePath) {
				console.log(`Bad file: ${JSON.stringify(singleParameter)}`);
				process.exit(1);
			}
			return [singleParameter];
		})();
		if (filesToUpload.length) {
			const wallet = readJWKFile(options.walletFile);
			const priceEstimator: ARDataPriceEstimator = (() => {
				if (filesToUpload.length > ARDataPriceRegressionEstimator.sampleByteVolumes.length) {
					return new ARDataPriceRegressionEstimator(false, new GatewayOracle());
				} else {
					return new ARDataPriceOracleEstimator();
				}
			})();

			const arDrive = arDriveFactory({
				wallet: wallet,
				priceEstimator: priceEstimator,
				feeMultiple: options.boost as FeeMultiple,
				dryRun: options.dryRun
			});
			await Promise.all(
				filesToUpload.map(async (fileToUpload) => {
					if (!fileToUpload.parentFolderId || !fileToUpload.localFilePath) {
						console.log(`Bad file: ${JSON.stringify(fileToUpload)}`);
						process.exit(1);
					}
					const result = await (async () => {
						if (options.drivePassword) {
							return arDrive.uploadPrivateFile(
								fileToUpload.parentFolderId,
								fileToUpload.localFilePath,
								options.drivePassword,
								fileToUpload.destinationFileName
							);
						} else {
							return arDrive.uploadPublicFile(
								fileToUpload.parentFolderId,
								fileToUpload.localFilePath,
								fileToUpload.destinationFileName
							);
						}
					})();
					console.log(JSON.stringify(result, null, 4));
				})
			);
			process.exit(0);
		}
		console.log(`No files to upload`);
		process.exit(1);
	}
});
