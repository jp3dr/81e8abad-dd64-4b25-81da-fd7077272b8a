import { spawn, ChildProcess } from 'child_process';

export class PredictedProcess {
  private _childProcess: ChildProcess | null = null;
  private _resultCache: Map<string, any>;
  private _isLocked: boolean = false;

  public constructor(
    public readonly id: number,
    public readonly command: string,
  ) {
    this._resultCache = new Map();
  }

  private isCommandValid(commandString: string) {
    // Split the command string by semicolon
    const commands = commandString.split(';').map(cmd => cmd.trim());
    const validCommandPatterns = [
      /^echo "Process \d+"$/,
      /^sleep \d+$/,
      /^command [A-Za-z]$/,
      new RegExp(`^test command$`)
    ];

    // Check each command
    return commands.map(cmd => {
      if (validCommandPatterns.some(pattern => pattern.test(cmd))) {
        return true;
      } else {
        return false;
      }
    });
  }

  public async run(signal?: AbortSignal): Promise<void> {
    this._isLocked = true;
    await this.waitForUnlock();

    const signalKey = signal ? 'signal-' + this.id : 'no-signal-' + this.id;
    const cacheKey = this.command + signalKey;
    if (this._resultCache.has(cacheKey)) {
      // Return the cached promise
      return this._resultCache.get(cacheKey);
    }

    if (!(await this.isCommandValid(this.command)).every(Boolean)) {
      throw new Error('Invalid command');
    }

    const processPromise: any = new Promise((resolve, reject) => {

      if (signal && signal.aborted) {
        reject(new Error('Signal already aborted'));
        return;
      }

      this._childProcess = spawn(this.command, {
        shell: true,
        stdio: 'ignore',
      });

      if (signal) {

        const abortHandler = () => {
          if (this._childProcess && !this._childProcess.killed) {
            this._childProcess.kill();
            this.cleanup();
            reject(new Error('Process aborted'));
          }
        };

        signal.addEventListener('abort', abortHandler);
        signal.addEventListener('close', abortHandler);
      }

      this._childProcess.on('close', (code) => {
        this.cleanup();
        const result = code === 0 ? 'resolve' : 'reject';
        this._resultCache.set(this.command + signalKey, result);
        if (code === 0) {
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

    return processPromise.finally(() => {
      this._isLocked = false;
    });
  }

  public memoize(): PredictedProcess {
    const memoizedProcess = new PredictedProcess(this.id, this.command);
    memoizedProcess._resultCache = this._resultCache;
    return memoizedProcess;
  }

  private cleanup() {
    if (this._childProcess) {
      this._childProcess?.removeAllListeners();
      if (!this._childProcess.killed) {
        this._childProcess.kill();
      }
    }
    this._isLocked = false;  // Release the lock before returning
    this._childProcess = null;
  }

  public abort(): void {
    if (this._childProcess && !this._childProcess.killed) {
      this.cleanup();
      this._childProcess.kill();
      this._childProcess = null;
    }
  }

  private waitForUnlock(): Promise<void> {
    return new Promise((resolve) => {
      const checkLock = () => {
        if (!this._isLocked) {
          resolve();
        } else {
          // Check again after a delay
          setTimeout(checkLock, 1); // 100 ms delay
        }
      };
      console.log("inside", this._isLocked)
      checkLock();
    });
  }

  private delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}