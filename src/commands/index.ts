import { CLICommand } from '../CLICommand';
import { showHelp } from '../utils';
import '../parameter_declarations';
import './create_drive';
import './drive_info';
import './upload_file';
import './tx_status';
import './get_mempool';
import './send_ar';
import './get_balance';
import './get_address';
import './generate_seedphrase';
import './generate_wallet';
import './list_folder';

const program = CLICommand.program;

CLICommand.parse();
const opts = program.opts();
if (
	opts.help ||
	(Object.getOwnPropertyNames(opts).length === 0 && Object.getOwnPropertyNames(program.arguments).length === 0)
) {
	showHelp();
	process.exit(0);
}
