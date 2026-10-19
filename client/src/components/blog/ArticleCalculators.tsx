import { useState } from "react";

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

function NumberField({
  id,
  label,
  value,
  onChange,
  min = "0",
  step = "any",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  step?: string;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}

export function DeviceUpgradeCalculator() {
  const [support, setSupport] = useState("unsure");
  const [dailyFriction, setDailyFriction] = useState("sometimes");
  const [repairCost, setRepairCost] = useState("");
  const [replacementCost, setReplacementCost] = useState("");

  const repair = repairCost.trim() ? Number(repairCost) : NaN;
  const replacement = replacementCost.trim() ? Number(replacementCost) : NaN;
  const hasPrices = Number.isFinite(repair) && Number.isFinite(replacement) && replacement > 0 && repair >= 0;
  const repairShare = hasPrices ? repair / replacement : undefined;

  let recommendation = "Enter both prices to compare them, then check whether your current device still receives security updates.";
  if (support === "no") {
    recommendation = "First check whether your device can still be kept secure. If important security updates have ended, compare a supported replacement—including a reputable refurbished model—rather than relying on a low repair quote alone.";
  } else if (hasPrices && repairShare !== undefined && repairShare <= 0.35 && support === "yes" && dailyFriction !== "often") {
    recommendation = "Repairing may be the better-value next step: the repair is 35% or less of replacement cost, your device is still supported, and daily slowdowns are not frequent. Confirm the repair warranty and any other faults first.";
  } else if (hasPrices && repairShare !== undefined && (repairShare >= 0.5 || dailyFriction === "often")) {
    recommendation = "Compare replacement options before paying for the repair. Include a previous-generation or refurbished model, and check battery health, software support, network compatibility, return terms and warranty.";
  } else if (hasPrices && support === "yes") {
    recommendation = "There may be no need to rush. Compare the repair with the remaining useful life of your supported device, and only replace it if the reliability or performance improvement is worth the full local price.";
  }

  return (
    <section
      id="upgrade-decision-tool"
      aria-labelledby="upgrade-decision-heading"
      className="my-12 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Interactive guide</p>
      <h2 id="upgrade-decision-heading" className="mt-2 text-2xl font-bold text-slate-900">
        Should you keep, repair or replace your device?
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use the same currency for both prices. This simple rule of thumb is a starting point, not a repair quote or a guarantee of savings.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label htmlFor="device-support" className="block text-sm font-medium text-slate-700">
          Does it still receive security updates?
          <select
            id="device-support"
            value={support}
            onChange={(event) => setSupport(event.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="unsure">I’m not sure</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label htmlFor="device-friction" className="block text-sm font-medium text-slate-700">
          How often does performance disrupt your day?
          <select
            id="device-friction"
            value={dailyFriction}
            onChange={(event) => setDailyFriction(event.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="rarely">Rarely</option>
            <option value="sometimes">Sometimes</option>
            <option value="often">Often</option>
          </select>
        </label>
        <NumberField id="device-repair-cost" label="Estimated repair cost" value={repairCost} onChange={setRepairCost} />
        <NumberField id="device-replacement-cost" label="Replacement device cost" value={replacementCost} onChange={setReplacementCost} />
      </div>
      <div aria-live="polite" className="mt-5 rounded-xl border border-blue-100 bg-white p-4">
        {repairShare !== undefined && (
          <p className="mb-2 text-sm font-semibold text-blue-800">
            Repair quote: {formatNumber(repairShare * 100)}% of replacement cost
          </p>
        )}
        <p className="text-sm leading-6 text-slate-700">{recommendation}</p>
      </div>
    </section>
  );
}

export function AiPilotCalculator() {
  const [people, setPeople] = useState("");
  const [savedHours, setSavedHours] = useState("");
  const [reviewHours, setReviewHours] = useState("");
  const [hourlyValue, setHourlyValue] = useState("");
  const [softwareCost, setSoftwareCost] = useState("");
  const [operatingCost, setOperatingCost] = useState("");

  const values = [people, savedHours, reviewHours, hourlyValue, softwareCost];
  const numbers = values.map((value) => (value.trim() ? Number(value) : NaN));
  const overhead = operatingCost.trim() ? Number(operatingCost) : 0;
  const valid =
    numbers.every(Number.isFinite) &&
    numbers[0] > 0 &&
    numbers.slice(1).every((value) => value >= 0) &&
    Number.isFinite(overhead) &&
    overhead >= 0;
  const netMonthly = valid
    ? numbers[0] * (numbers[1] - numbers[2]) * numbers[3] - numbers[4] - overhead
    : undefined;

  return (
    <section
      id="ai-pilot-calculator"
      aria-labelledby="ai-pilot-calculator-heading"
      className="my-12 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-violet-700">Interactive guide</p>
      <h2 id="ai-pilot-calculator-heading" className="mt-2 text-2xl font-bold text-slate-900">
        Estimate your AI pilot’s monthly break-even point
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use one currency throughout. Enter monthly hours per person, and count only time that is genuinely returned after review and corrections.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <NumberField id="ai-people" label="People using the tool" value={people} onChange={setPeople} step="1" min="1" />
        <NumberField id="ai-saved-hours" label="Hours saved per person each month" value={savedHours} onChange={setSavedHours} />
        <NumberField id="ai-review-hours" label="Extra review hours per person each month" value={reviewHours} onChange={setReviewHours} />
        <NumberField id="ai-hourly-value" label="Estimated value of one work hour" value={hourlyValue} onChange={setHourlyValue} />
        <NumberField id="ai-software-cost" label="Monthly AI software and usage cost" value={softwareCost} onChange={setSoftwareCost} />
        <NumberField id="ai-operating-cost" label="Other monthly operating costs (optional)" value={operatingCost} onChange={setOperatingCost} />
      </div>
      <div aria-live="polite" className="mt-5 rounded-xl border border-violet-100 bg-white p-4">
        {netMonthly === undefined ? (
          <p className="text-sm leading-6 text-slate-700">
            Complete the first five fields to see a rough estimate. Leave other monthly costs blank only if you have no reasonable estimate yet.
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated monthly net value, before risk and quality adjustments</p>
            <p className={`mt-1 text-2xl font-bold ${netMonthly >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {netMonthly < 0 ? "−" : ""}{formatNumber(Math.abs(netMonthly))} <span className="text-sm font-medium">in your entered currency</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {netMonthly > 0
                ? "This is a positive first-pass estimate, not proof of ROI. Validate output quality, customer outcomes, security and the actual time saved before scaling."
                : "On these inputs, the pilot has not reached break-even. Check whether the time estimates include review and correction, then decide whether the use case merits another test."}
            </p>
          </>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        This calculator does not price reputational harm, compliance obligations, customer value or cash savings that may not be realized.
      </p>
    </section>
  );
}
