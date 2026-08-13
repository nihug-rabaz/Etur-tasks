"use client";

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
    <fieldset className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50 sm:col-span-2">
      <legend className="mb-2 text-xs font-bold text-text-secondary">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              values.includes(option.value)
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-text-primary dark:bg-slate-800"
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
