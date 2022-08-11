const ARDRIVE_PROGRESS_LOG = 'ARDRIVE_PROGRESS_LOG';

export const showProgressLog = process.env[ARDRIVE_PROGRESS_LOG] && process.env[ARDRIVE_PROGRESS_LOG] === '1';
