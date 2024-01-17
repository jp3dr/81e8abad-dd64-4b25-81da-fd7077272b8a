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
   * 
   * In the runAll method, I implemented abort signal handling because I wanted to ensure that all processes could be stopped immediately if an abort signal is received. 
   * By setting up an event listener for the 'abort' event, I made sure that all processes are terminated promptly. 
   * This is crucial for scenarios where immediate termination of processes is necessary.

   * I chose Promise.allSettled for concurrent execution because it allows all processes to run simultaneously and independently. 
   * This method is efficient in handling multiple asynchronous tasks, and it waits for all of them to complete, regardless of whether they succeed or fail. 
   * This way, I could handle each process's result collectively after they all settle.

   * Finally, I included post-execution validation to ensure robust error handling. 
   * If any process fails or if the execution was aborted, I wanted to inform the caller by throwing an error. 
   * This approach ensures the caller is aware of the overall execution status, making the method more reliable and transparent.
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