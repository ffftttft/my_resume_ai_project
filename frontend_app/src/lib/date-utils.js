const MONTH_PATTERN = /^(?<year>\d{4})\s*[-./年]?\s*(?<month>\d{1,2})\s*(?:月)?$/;
const DATE_PATTERN =
  /^(?<year>\d{4})\s*[-./年]?\s*(?<month>\d{1,2})\s*[-./月]?\s*(?<day>\d{1,2})\s*(?:日)?$/;
const OPEN_ENDED_VALUES = new Set(["至今", "present", "current", "ongoing", "now"]);

function pad(value) {
  return String(value).padStart(2, "0");
}

export function normalizeMonthInput(value, { allowPresent = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (allowPresent && OPEN_ENDED_VALUES.has(raw.toLowerCase())) {
    return "至今";
  }

  const match = raw.match(MONTH_PATTERN);
  if (!match?.groups) return raw;

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  if (month < 1 || month > 12) return raw;
  return `${year}-${pad(month)}`;
}

export function normalizeDateInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(DATE_PATTERN);
  if (!match?.groups) return raw;

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const nextValue = `${year}-${pad(month)}-${pad(day)}`;
  const nextDate = new Date(`${nextValue}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) return raw;
  if (
    nextDate.getFullYear() !== year ||
    nextDate.getMonth() + 1 !== month ||
    nextDate.getDate() !== day
  ) {
    return raw;
  }
  return nextValue;
}

export function getCurrentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
}

export function toMonthDate(value) {
  if (!value || value === "至今") return null;
  const normalized = normalizeMonthInput(value);
  if (!/^\d{4}-\d{2}$/.test(normalized)) return null;
  const [year, month] = normalized.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function toExactDate(value) {
  const normalized = normalizeDateInput(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const nextDate = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

export function calculateAge(birthDate) {
  const dateValue = toExactDate(birthDate);
  if (!dateValue) return null;
  const today = new Date();
  let age = today.getFullYear() - dateValue.getFullYear();
  const monthDiff = today.getMonth() - dateValue.getMonth();
  const dayDiff = today.getDate() - dateValue.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
}

export function validateBirthDate(value, options = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // 如果 skipValidation 为 true，不进行验证（用于页面加载时）
  if (options.skipValidation) return "";

  const normalized = normalizeDateInput(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return "出生日期需为 YYYY-MM-DD。";
  }

  const dateValue = toExactDate(normalized);
  if (!dateValue) return "出生日期不合法。";

  const today = new Date();
  if (dateValue > today) return "出生日期不能晚于今天。";

  const age = calculateAge(normalized);
  if (typeof age !== "number" || age < 14 || age > 80) {
    return "年龄需在 14 到 80 岁之间。";
  }

  return "";
}

export function validateMonthValue(
  value,
  {
    label = "日期",
    allowPresent = false,
    allowFuture = false,
  } = {},
) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = normalizeMonthInput(raw, { allowPresent });
  if (allowPresent && normalized === "至今") return "";
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    return `${label}需为 YYYY-MM。`;
  }

  const monthDate = toMonthDate(normalized);
  if (!monthDate) return `${label}不合法。`;

  if (!allowFuture) {
    const currentMonth = toMonthDate(getCurrentMonthValue());
    if (currentMonth && monthDate > currentMonth) {
      return `${label}不能晚于当前月份。`;
    }
  }

  return "";
}

export function validateMonthRange(
  startValue,
  endValue,
  {
    startLabel = "开始时间",
    endLabel = "结束时间",
    allowFutureEnd = false,
    allowPresentEnd = false,
  } = {},
) {
  const startError = validateMonthValue(startValue, {
    label: startLabel,
    allowFuture: false,
  });
  const endError = validateMonthValue(endValue, {
    label: endLabel,
    allowFuture: allowFutureEnd,
    allowPresent: allowPresentEnd,
  });

  if (startError || endError) {
    return { startError, endError, rangeError: "" };
  }

  const startDate = toMonthDate(startValue);
  const endDate = endValue === "至今" ? null : toMonthDate(endValue);
  if (startDate && endDate && startDate > endDate) {
    return {
      startError: "",
      endError: "",
      rangeError: `${startLabel}不能晚于${endLabel}。`,
    };
  }

  return {
    startError: "",
    endError: "",
    rangeError: "",
  };
}

export function toNativePickerValue(value, mode = "date") {
  if (!value || value === "至今") return "";
  return mode === "month" ? normalizeMonthInput(value) : normalizeDateInput(value);
}
