"use client";

import { pillActiveClass, pillIdleClass } from "@/modules/dovrut/lib/ui";

export function DovrutCheckboxGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <fieldset className="rounded-xl bg-surface-2/50 p-3 sm:col-span-2">
      <legend className="mb-2 text-xs font-bold text-text-secondary">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`inline-flex cursor-pointer items-center gap-2 ${
 values.includes(option.value) ? pillActiveClass : pillIdleClass
 }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={values.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
