export type ArweaveAddress = string;
export type PublicKey = string;
export type SeedPhrase = string;

/** TODO: Use big int library on Winston types */
export type Winston = string;
export type NetworkReward = Winston;

export type FolderID = string;
export type FileID = string;
export type DriveID = string;

export type CipherIV = string;
export type DriveKey = Buffer;

export type Bytes = number;
export type DataContentType = string;

export type TransactionID = string;

export interface ArDriveCommunityTip {
	tipPercentage: number;
	minWinstonFee: number; // TODO: Align with Winston type?
}
