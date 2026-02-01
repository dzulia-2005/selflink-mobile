export type IpayPollSession = {
  start: (
    delays: number[],
    onTick: (sessionId: number, isLast: boolean) => void | Promise<void>,
  ) => number;
  stop: () => void;
  isActive: (sessionId: number) => boolean;
};

export const createIpayPollSession = (): IpayPollSession => {
  let sessionId = 0;
  let active = false;
  let timers: ReturnType<typeof setTimeout>[] = [];

  const stop = () => {
    active = false;
    sessionId += 1;
    timers.forEach((timer) => clearTimeout(timer));
    timers = [];
  };

  const start = (
    delays: number[],
    onTick: (session: number, isLast: boolean) => void | Promise<void>,
  ) => {
    stop();
    active = true;
    const currentSession = sessionId;
    timers = delays.map((delay, index) =>
      setTimeout(() => {
        if (!active || sessionId !== currentSession) {
          return;
        }
        Promise.resolve(onTick(currentSession, index === delays.length - 1)).catch(
          () => undefined,
        );
      }, delay),
    );
    return currentSession;
  };

  const isActive = (id: number) => active && sessionId === id;

  return { start, stop, isActive };
};

export const shouldCompleteIpayPolling = (baseline: number, current: number) =>
  current > baseline;
