export class VisibleRequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The request exceeded ${timeoutMs / 1000} seconds of active page time.`);
    this.name = "VisibleRequestTimeoutError";
  }
}

export function withVisibleRequestTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: number | undefined;
  let activeSince: number | null = null;
  let activeElapsed = 0;
  let settled = false;
  let rejectTimeout: (error: Error) => void = () => undefined;

  const timeout = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });

  const stopTimer = () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (activeSince !== null) {
      activeElapsed += performance.now() - activeSince;
      activeSince = null;
    }
  };

  const startTimer = () => {
    if (settled || document.visibilityState === "hidden" || timeoutId !== undefined) return;
    activeSince = performance.now();
    const remaining = Math.max(0, timeoutMs - activeElapsed);
    timeoutId = window.setTimeout(() => {
      timeoutId = undefined;
      if (document.visibilityState === "hidden") {
        stopTimer();
        return;
      }
      activeElapsed += performance.now() - (activeSince ?? performance.now());
      activeSince = null;
      if (activeElapsed >= timeoutMs) {
        settled = true;
        controller.abort();
        rejectTimeout(new VisibleRequestTimeoutError(timeoutMs));
      } else {
        startTimer();
      }
    }, remaining);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") stopTimer();
    else startTimer();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  startTimer();
  const pending = Promise.resolve().then(() => request(controller.signal));
  return Promise.race([pending, timeout]).finally(() => {
    settled = true;
    stopTimer();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });
}
