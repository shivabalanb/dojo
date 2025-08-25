import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
};

export const Input = ({ label, helper, ...props }: InputProps) => (
  <div className="space-y-1">
    <label className="text-sm font-semibold text-slate-800">{label}</label>
    <input
      {...props}
      className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium"
    />
    {helper && <p className="text-xs text-slate-500">{helper}</p>}
  </div>
);

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helper?: string;
};

export const Textarea = ({ label, helper, ...props }: TextareaProps) => (
  <div className="space-y-1">
    <label className="text-sm font-semibold text-slate-800">{label}</label>
    <textarea
      {...props}
      className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium"
    />
    {helper && <p className="text-xs text-slate-500">{helper}</p>}
  </div>
);

type Duration = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

export const DurationPicker = ({
  value,
  onChange,
}: {
  value: Duration;
  onChange: (d: Duration) => void;
}) => {
  const keys: (keyof Duration)[] = ["days", "hours", "minutes", "seconds"];
  return (
    <div className="text-slate-800">
      <label className="text-sm font-semibold ">Duration</label>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <div key={k} className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              {k}
            </span>
            <input
              type="number"
              min="0"
              value={value[k]}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl text-center text-sm font-medium"
            />
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-600">
        How long betting stays open.
      </p>
    </div>
  );
};

export const PreviewCard = ({
  title,
  duration,
  liquidity,
}: {
  title: string;
  duration: string;
  liquidity: string;
}) => (
  <div className="rounded-xl bg-slate-50 p-4 border-2 border-slate-200">
    <p className="font-semibold text-slate-800">Preview</p>
    <p className="text-sm text-slate-600 mt-1">
      {title} — {duration} — {liquidity} USDC liquidity
    </p>
  </div>
);


