import type { ChildProcess } from 'child_process';

export class PredictedProcess {
  private _childProcess: ChildProcess | null = null;
  private _resultCache: Map<string, any>;

  public constructor(
    public readonly id: number,
    public readonly command: string,
  ) {
    this._resultCache = new Map();
  }

  public async run(signal?: AbortSignal): Promise<void> {
    // TODO: Implement this.
  }

  public memoize(): PredictedProcess {
    const memoizedProcess = new PredictedProcess(this.id, this.command);
    memoizedProcess._resultCache = this._resultCache;
    return memoizedProcess;
  }

  private cleanup() {
    this._childProcess?.removeAllListeners();
    this._childProcess = null;
  }

  public abort(): void {
    if (this._childProcess && !this._childProcess.killed) {
      this.cleanup();
      this._childProcess.kill();
      this._childProcess = null;
    }
  }
}
