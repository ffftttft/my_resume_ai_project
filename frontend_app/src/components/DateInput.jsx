import React, { useId, useRef } from "react";
import { CalendarDays } from "lucide-react";

import {
  normalizeDateInput,
  normalizeMonthInput,
  toNativePickerValue,
} from "../lib/date-utils";

export default function DateInput({
  value,
  onChange,
  mode = "date",
  placeholder = "",
  allowPresent = false,
  error = "",
  disabled = false,
  name = "",
}) {
  const pickerId = useId();
  const pickerRef = useRef(null);

  const hasValue = Boolean(String(value || "").trim());
  const hasError = Boolean(error);

  // 确定状态类
  const stateClass = hasError
    ? "is-invalid"      // 红色边框
    : !hasValue
      ? "is-empty"      // 黄色边框
      : "";             // 正常状态

  function normalizeValue(nextValue) {
    return mode === "month"
      ? normalizeMonthInput(nextValue, { allowPresent })
      : normalizeDateInput(nextValue);
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    picker.click();
  }

  return (
    <div className="space-y-2">
      <div className={`date-input ${stateClass}`}>
        <input
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onChange(normalizeValue(event.target.value))}
          placeholder={placeholder}
          className="date-input__text"
          disabled={disabled}
        />
        <div className="date-input__actions">
          {allowPresent && value === "至今" ? <span className="date-input__present">至今</span> : null}
          <button
            type="button"
            onClick={openPicker}
            className="date-input__button"
            aria-label={mode === "month" ? "选择年月" : "选择日期"}
            disabled={disabled}
          >
            <CalendarDays size={16} />
          </button>
        </div>
        <input
          id={pickerId}
          ref={pickerRef}
          type={mode}
          value={toNativePickerValue(value, mode)}
          className="date-input__native"
          tabIndex={-1}
          onChange={(event) => onChange(normalizeValue(event.target.value))}
          disabled={disabled}
        />
      </div>
      {error ? <p className="form-field__error">{error}</p> : null}
    </div>
  );
}
