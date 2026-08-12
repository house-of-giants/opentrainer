const MS_PER_DAY = 24 * 60 * 60 * 1000;

type LocalDateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

type LocalTimeParts = {
  hours: number;
  minutes: number;
};

export type WorkoutTimeEditRange = {
  startedAt: number | null;
  completedAt: number | null;
  dateInvalid: boolean;
  startTimeInvalid: boolean;
  endTimeInvalid: boolean;
};

export type WorkoutTimeEditValidationState = {
  message: string | null;
  dateInvalid?: boolean;
  startInvalid?: boolean;
  endInvalid?: boolean;
};

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function parseLocalDateInput(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const monthIndex = month - 1;
  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, monthIndex, day };
}

function parseLocalTimeInput(value: string): LocalTimeParts | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
}

function getLocalCalendarDayIndex(timestamp: number) {
  const date = new Date(timestamp);
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY
  );
}

function addLocalCalendarDays(
  dateParts: LocalDateParts,
  dayOffset: number
): LocalDateParts | null {
  const timestamp = Date.UTC(
    dateParts.year,
    dateParts.monthIndex,
    dateParts.day + dayOffset
  );

  if (Number.isNaN(timestamp)) return null;

  const date = new Date(timestamp);
  return {
    year: date.getUTCFullYear(),
    monthIndex: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

export function getLocalDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function getLocalTimeInputValue(timestamp: number) {
  const date = new Date(timestamp);
  return [padDatePart(date.getHours()), padDatePart(date.getMinutes())].join(
    ":"
  );
}

export function getLocalCalendarDayOffset(
  startedAt: number,
  completedAt: number
) {
  return (
    getLocalCalendarDayIndex(completedAt) -
    getLocalCalendarDayIndex(startedAt)
  );
}

export function buildLocalDateTimeTimestamp({
  dateValue,
  timeValue,
  dayOffset = 0,
}: {
  dateValue: string;
  timeValue: string;
  dayOffset?: number;
}) {
  const dateParts = parseLocalDateInput(dateValue);
  const timeParts = parseLocalTimeInput(timeValue);

  if (!dateParts || !timeParts) return null;

  const expectedDateParts = addLocalCalendarDays(dateParts, dayOffset);
  if (!expectedDateParts) return null;

  const date = new Date(
    dateParts.year,
    dateParts.monthIndex,
    dateParts.day + dayOffset,
    timeParts.hours,
    timeParts.minutes,
    0,
    0
  );
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return null;

  if (
    date.getFullYear() !== expectedDateParts.year ||
    date.getMonth() !== expectedDateParts.monthIndex ||
    date.getDate() !== expectedDateParts.day ||
    date.getHours() !== timeParts.hours ||
    date.getMinutes() !== timeParts.minutes
  ) {
    return null;
  }

  return timestamp;
}

export function buildWorkoutTimeEditRange({
  initialStartedAt,
  initialCompletedAt,
  dateValue,
  startedAtTimeValue,
  completedAtTimeValue,
}: {
  initialStartedAt: number;
  initialCompletedAt: number;
  dateValue: string;
  startedAtTimeValue: string;
  completedAtTimeValue: string;
}): WorkoutTimeEditRange {
  const dateInvalid = parseLocalDateInput(dateValue) === null;
  const startTimeInvalid = parseLocalTimeInput(startedAtTimeValue) === null;
  const endTimeInvalid = parseLocalTimeInput(completedAtTimeValue) === null;
  const completedDayOffset = getLocalCalendarDayOffset(
    initialStartedAt,
    initialCompletedAt
  );

  return {
    startedAt:
      dateInvalid || startTimeInvalid
        ? null
        : buildLocalDateTimeTimestamp({
            dateValue,
            timeValue: startedAtTimeValue,
          }),
    completedAt:
      dateInvalid || endTimeInvalid
        ? null
        : buildLocalDateTimeTimestamp({
            dateValue,
            timeValue: completedAtTimeValue,
            dayOffset: completedDayOffset,
          }),
    dateInvalid,
    startTimeInvalid,
    endTimeInvalid,
  };
}

export function validateWorkoutTimeEditRange(
  range: WorkoutTimeEditRange,
  now = Date.now()
): WorkoutTimeEditValidationState {
  if (range.dateInvalid) {
    return { message: "Choose a workout date", dateInvalid: true };
  }

  if (range.startedAt === null || range.startTimeInvalid) {
    return { message: "Choose a start time", startInvalid: true };
  }

  if (range.completedAt === null || range.endTimeInvalid) {
    return { message: "Choose an end time", endInvalid: true };
  }

  if (range.startedAt >= range.completedAt) {
    return { message: "End time must be after start time", endInvalid: true };
  }

  if (range.startedAt > now || range.completedAt > now) {
    return {
      message: "Workout timestamps can't be in the future",
      ...(range.startedAt > now ? { startInvalid: true } : {}),
      ...(range.completedAt > now ? { endInvalid: true } : {}),
    };
  }

  return { message: null };
}
