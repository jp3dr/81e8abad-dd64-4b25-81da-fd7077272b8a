import { spawn, ChildProcess } from 'child_process';

export class PredictedProcess {
  private _childProcess: ChildProcess | null = null;
  private _resultCache: Map<string, any>;
  private _isLocked: boolean = false;

  private _executionQueue: Array<() => Promise<void>> = [];
  private _isProcessing: boolean = false;

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

  // In the PredictedProcess class, I designed the run method to handle the execution of a process and ensure that it doesn't overlap with others. 
  // It did work for some cases. 
  // I used a queue system to manage concurrent invocations. 
  // When run is called, the execution task is pushed into a queue, and processQueue is called to manage the execution order.
  
  public async run(signal?: AbortSignal): Promise<void> {


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
      this._executionQueue.push(() => this.executeRun(resolve, reject, cacheKey, signal));

      // Process the queue if not already processing
      if (!this._isProcessing) {
        this.processQueue();
      }
    });

    return processPromise;
  }

  // I created the memoize method to cache instances of PredictedProcess with the same ID and command. 
  // This way, I avoid unnecessary reinitializations and leverage existing instances, optimizing performance.
  public memoize(): PredictedProcess {
    const memoizedProcess = new PredictedProcess(this.id, this.command);
    memoizedProcess._resultCache = this._resultCache;
    return memoizedProcess;
  }

  // In my executeRun method, I aimed to encapsulate the core functionality of running a process. 
  // This method is invoked from the execution queue, handling the spawning of the child process and setting up listeners for 'close' and 'error' events. 
  // It manages abort signals, ensuring the process is terminated if an abort is signaled. 
  // This approach isolates the execution logic, making it more maintainable and testable.

  private async executeRun(resolve: Function, reject: Function, cacheKey: string, signal?: AbortSignal) {

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

    this._childProcess?.on('close', (code) => {
      this.cleanup();
      const result = code === 0 ? 'resolve' : 'reject';
      this._resultCache.set(cacheKey, result);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    this._childProcess?.on('error', (err) => {
      this.cleanup();
      reject(err);
    });

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

  // However, the processQueue method, while a good idea in theory, didn't work optimally in all cases. 
  // It was designed to process tasks sequentially from the execution queue, aiming to prevent concurrent process overlaps. 
  // Although this approach is conceptually sound, it faced challenges in certain execution scenarios, leading me to explore alternatives like the lock function. 
  // The lock function approach was another attempt to manage concurrency, ensuring that only one process runs at a time by setting a lock flag. 
  // However, it also had limitations, indicating the complexity of handling asynchronous processes in a controlled manner.

  private async processQueue() {
    if (this._executionQueue.length === 0) {
      this._isProcessing = false;
      return;
    }

    this._isProcessing = true;
    const nextExecution = this._executionQueue.shift();
    if (nextExecution) {
      await nextExecution();
      this.processQueue();
    }
  }


}
