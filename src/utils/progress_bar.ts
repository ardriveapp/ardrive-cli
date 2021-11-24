import progress from 'progress';
import { Transform } from 'stream';

export class ProgressBar {
	private progressApi: progress;
	private downloadCountString = '';

	constructor(private readonly totalLength: number, itemNumber?: number, itemCount?: number) {
		this.downloadCountString = (function () {
			if (itemNumber && itemCount) {
				return `${itemNumber}/${itemCount}`;
			}
			return '';
		})();
		this.progressApi = new progress(':count [:bar] ETA: :etas', {
			total: this.totalLength,
			stream: process.stderr,
			incomplete: '-',
			complete: '=',
			head: '>',
			clear: true
		});
	}

	public readonly passThroughStream: Transform = new Transform({
		transform: (
			chunk: string | Buffer,
			_encoding: BufferEncoding,
			next: (err?: Error, chunk?: string | Buffer) => void
		) => {
			// debugger;
			const delta = chunk.length;
			this.setValue(delta);
			next(undefined, chunk);
		}
	});

	public setValue(tickCount: number): void {
		this.progressApi.tick(tickCount, { count: this.downloadCountString });
	}
}
