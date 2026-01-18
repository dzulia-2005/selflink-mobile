import { createIpayPollSession, shouldCompleteIpayPolling } from '@utils/ipayPolling';

describe('ipay polling helpers', () => {
  it('completes when balance increases from baseline', () => {
    expect(shouldCompleteIpayPolling(1000, 1200)).toBe(true);
  });

  it('uses baseline even if balance dips before mint', () => {
    expect(shouldCompleteIpayPolling(1000, 900)).toBe(false);
    expect(shouldCompleteIpayPolling(1000, 1100)).toBe(true);
  });

  it('stops scheduled ticks after success', () => {
    jest.useFakeTimers();
    const session = createIpayPollSession();
    const onTick = jest.fn(() => {
      session.stop();
    });

    session.start([0, 10, 20], onTick);
    jest.runAllTimers();

    expect(onTick).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
