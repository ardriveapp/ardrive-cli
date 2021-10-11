import { ArFSFileFolderEntity } from 'ardrive-core-js';
import Transaction from 'arweave/node/lib/transaction';
import {
	ArFSMovePrivateFileResult,
	ArFSMovePrivateFolderResult,
	ArFSMovePublicFileResult,
	ArFSMovePublicFolderResult,
	ArFSPrivateFile,
	ArFSPrivateFolder,
	ArFSPublicFile,
	ArFSPublicFolder
} from './arfsdao';
import {
	ArFSObjectTransactionData,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFolderTransactionData,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFolderTransactionData
} from './arfs_trx_data_types';

export type MoveEntityResultFactoryFunction<R, T extends ArFSObjectTransactionData, U extends ArFSFileFolderEntity> = (
	transactionData: T,
	originalMetaData: U,
	metaDataTrx: Transaction
) => R;

export const movePublicFileResultFactory: MoveEntityResultFactoryFunction<
	ArFSMovePublicFileResult,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFile
> = (_transactionData, originalMetaData, metaDataTrx) => {
	return {
		metaDataTrxId: metaDataTrx.id,
		metaDataTrxReward: metaDataTrx.reward,
		dataTrxId: originalMetaData.dataTxId
	};
};

export const movePrivateFileResultFactory: MoveEntityResultFactoryFunction<
	ArFSMovePrivateFileResult,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFile
> = (transactionData, originalMetaData, metaDataTrx) => {
	return {
		metaDataTrxId: metaDataTrx.id,
		metaDataTrxReward: metaDataTrx.reward,
		dataTrxId: originalMetaData.dataTxId,
		fileKey: transactionData.fileKey
	};
};

export const movePublicFolderResultFactory: MoveEntityResultFactoryFunction<
	ArFSMovePublicFolderResult,
	ArFSPublicFolderTransactionData,
	ArFSPublicFolder
> = (_transactionData, _originalMetaData, metaDataTrx) => {
	return {
		metaDataTrxId: metaDataTrx.id,
		metaDataTrxReward: metaDataTrx.reward
	};
};

export const movePrivateFolderResultFactory: MoveEntityResultFactoryFunction<
	ArFSMovePrivateFolderResult,
	ArFSPrivateFolderTransactionData,
	ArFSPrivateFolder
> = (transactionData, _originalMetaData, metaDataTrx) => {
	return {
		metaDataTrxId: metaDataTrx.id,
		metaDataTrxReward: metaDataTrx.reward,
		driveKey: transactionData.driveKey
	};
};
