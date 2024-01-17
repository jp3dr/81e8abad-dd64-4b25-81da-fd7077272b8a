import type { ChildProcess } from 'child_process';

export class PredictedProcess {
  private _childProcess: ChildProcess | null = null;

  public constructor(
    public readonly id: number,
    public readonly command: string,
  ) {}

  /**
   * Spawns and manages a child process to execute a given command, with handling for an optional AbortSignal.
   *
   * WRITE UP:
   * (Please provide a detailed explanation of your approach, specifically the reasoning behind your design decisions. This can be done _after_ the 1h30m time limit.)
   *
   * ...
   *
   */
  public async run(signal?: AbortSignal): Promise<void> {
    // TODO: Implement this.
  }

  /**
   * Returns a memoized version of `PredictedProcess`.
   *
   * WRITE UP:
   * (Please provide a detailed explanation of your approach, specifically the reasoning behind your design decisions. This can be done _after_ the 1h30m time limit.)
   *
   * ...
   *
   */
  public memoize(): PredictedProcess {
    // TODO: Implement this.
    return this;
  private cleanup() {
    this._childProcess?.removeAllListeners();
    this._childProcess = null;
  }
  }
}
