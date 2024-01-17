import type { PredictedProcess } from './PredictedProcess';

export class PredictedProcessesManager {
  private _processes: PredictedProcess[] = [];

  public constructor(processes: readonly PredictedProcess[] = []) {
    this._processes = processes.slice();
  }

  public get processes(): readonly PredictedProcess[] {
    return this._processes.slice();
  }

  public addProcess(process: PredictedProcess): this {
    this._processes.push(process);
    return this;
  }

  public removeProcess(id: number): this {
    this._processes = this._processes.filter((process) => process.id !== id);
    return this;
  }

  public getProcess(id: number): PredictedProcess | undefined {
    return this.processes.find((process) => process.id === id);
  }

  /**
   * Executes multiple predicted processes.
   *
   * WRITE UP:
   * (Please provide a detailed explanation of your approach, specifically the reasoning behind your design decisions. This can be done _after_ the 1h30m time limit.)
   *
   * ...
   *
   */
  public async runAll(signal?: AbortSignal): Promise<void> {
    let aborted = false;
    if (signal) {
      signal.addEventListener('abort', () => {
        aborted = true;
        this._processes.forEach(process => process.abort());
      });
    }

    const results = await Promise.allSettled(this._processes.map(process => process.run(signal)));

    if (aborted) {
      throw new Error('Execution aborted');
    }

    const rejected = results.find(result => result.status === 'rejected');
    if (rejected) {
      throw new Error('At least one process failed');
    }
  }

}