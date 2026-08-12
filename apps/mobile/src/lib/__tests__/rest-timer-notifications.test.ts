import * as Notifications from "expo-notifications";

import {
  cancelRestEndNotification,
  scheduleRestEndNotification,
} from "@/lib/rest-timer-notifications";

const getPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissionsAsync =
  Notifications.requestPermissionsAsync as jest.Mock;
const scheduleNotificationAsync =
  Notifications.scheduleNotificationAsync as jest.Mock;
const cancelScheduledNotificationAsync =
  Notifications.cancelScheduledNotificationAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  requestPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  scheduleNotificationAsync.mockResolvedValue("notification-id");
});

describe("rest-timer-notifications", () => {
  it("registers a silent foreground notification handler on import", async () => {
    // setNotificationHandler runs at module scope; the app already shows the
    // in-app timer, so foreground presentations must stay quiet.
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance to observe import-time side effect
      require("@/lib/rest-timer-notifications");
    });
    const setHandler = Notifications.setNotificationHandler as jest.Mock;
    expect(setHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
    const behavior = await setHandler.mock.calls[0][0].handleNotification();
    expect(behavior).toEqual({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });

  it("schedules a time-interval notification and returns its id", async () => {
    const id = await scheduleRestEndNotification(90);

    expect(id).toBe("notification-id");
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Rest over",
        body: "Time for your next set.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 90,
        repeats: false,
      },
    });
  });

  it("requests permission lazily when not yet granted", async () => {
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });

    const id = await scheduleRestEndNotification(60);

    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(id).toBe("notification-id");
  });

  it("no-ops when permission is denied", async () => {
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });

    const id = await scheduleRestEndNotification(60);

    expect(id).toBeNull();
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("no-ops when the request is declined", async () => {
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });
    requestPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });

    const id = await scheduleRestEndNotification(60);

    expect(id).toBeNull();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("skips sub-second and invalid delays", async () => {
    expect(await scheduleRestEndNotification(0)).toBeNull();
    expect(await scheduleRestEndNotification(0.4)).toBeNull();
    expect(await scheduleRestEndNotification(Number.NaN)).toBeNull();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("returns null instead of throwing when scheduling fails", async () => {
    scheduleNotificationAsync.mockRejectedValue(new Error("native boom"));

    await expect(scheduleRestEndNotification(30)).resolves.toBeNull();
  });

  it("cancels a scheduled notification by id", async () => {
    await cancelRestEndNotification("notification-id");
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "notification-id",
    );
  });

  it("ignores empty ids and cancellation failures", async () => {
    await cancelRestEndNotification(null);
    await cancelRestEndNotification(undefined);
    expect(cancelScheduledNotificationAsync).not.toHaveBeenCalled();

    cancelScheduledNotificationAsync.mockRejectedValue(new Error("gone"));
    await expect(cancelRestEndNotification("stale")).resolves.toBeUndefined();
  });
});
