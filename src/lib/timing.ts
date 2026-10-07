export class ServerTiming {
  private entries: { name: string; dur: number }[] = [];

  async track<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    this.entries.push({ name, dur: Math.round(performance.now() - start) });
    return result;
  }

  header(): string {
    return this.entries.map((e) => `${e.name};dur=${e.dur}`).join(", ");
  }

  total(): number {
    return this.entries.reduce((sum, e) => sum + e.dur, 0);
  }
}
