import { CLICommand } from '../CLICommand';
import { showHelp } from '../utils';
import '../parameter_declarations';
import './drive';
import './file';
import './transaction';
import './wallet';

const program = CLICommand.program;

if (require.main === module) {
	CLICommand.parse();
	const opts = program.opts();
	if (
		opts.help ||
		(Object.getOwnPropertyNames(opts).length === 0 && Object.getOwnPropertyNames(program.arguments).length === 0)
	) {
		showHelp();
		process.exit(0);
	}
}
