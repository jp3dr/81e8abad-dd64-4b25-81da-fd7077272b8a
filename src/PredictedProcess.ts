import { spawn, ChildProcess } from 'child_process';

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
    if (this._resultCache.has(this.command)) {
      return this._resultCache.get(this.command);
    }

    return new Promise((resolve, reject) => {
      this._childProcess = spawn(this.command, {
        shell: true,
        stdio: 'ignore',
      });

      if (signal) {
        signal.addEventListener('abort', () => {
          this._childProcess?.kill();
          reject(new Error('Process aborted'));
        });
      }

      this._childProcess.on('close', (code) => {
        this.cleanup();
        if (code === 0) {
          this._resultCache.set(this.command, resolve);
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      this._childProcess.on('error', (err) => {
        this.cleanup();
        reject(err);
      });
    });
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