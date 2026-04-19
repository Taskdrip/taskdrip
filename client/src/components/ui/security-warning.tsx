import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, X, ShieldOff } from "lucide-react";
import { scanContent } from "@/lib/security-scanner";

interface SecurityWarningProps {
  value: string;
  className?: string;
  onSafe?: () => void;
  onThreat?: (threats: string[]) => void;
}

export function SecurityWarning({ value, className, onSafe, onThreat }: SecurityWarningProps) {
  const [threats, setThreats] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!value || value.trim().length < 4) {
      setThreats([]);
      setDismissed(false);
      return;
    }
    const result = scanContent(value);
    if (!result.isSafe) {
      setThreats(result.threats);
      setDismissed(false);
      onThreat?.(result.threats);
    } else {
      setThreats([]);
      onSafe?.();
    }
  }, [value]);

  if (threats.length === 0 || dismissed) return null;

  return (
    <div
      className={`rounded-xl border-2 border-red-300 bg-red-50 p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${className || ""}`}
      data-testid="security-warning-banner"
    >
      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
        <ShieldOff className="w-4 h-4 text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-red-800 font-bold text-sm flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Security Warning Detected
        </p>
        <ul className="mt-1 space-y-0.5">
          {threats.map((t, i) => (
            <li key={i} className="text-red-700 text-xs">• {t}</li>
          ))}
        </ul>
        <p className="mt-2 text-red-900 text-xs font-semibold bg-red-100 rounded-lg px-2 py-1.5 border border-red-200">
          ⚠️ Adding malicious scripts or unsafe links can result in your account being <strong>permanently banned</strong>.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
        data-testid="dismiss-security-warning"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onThreatDetected?: (threats: string[]) => void;
}

export function SecureInput({ onThreatDetected, onChange, className, ...props }: SecureInputProps) {
  const [value, setValue] = useState(String(props.value || props.defaultValue || ""));
  const [threats, setThreats] = useState<string[]>([]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    const result = scanContent(val);
    if (!result.isSafe) {
      setThreats(result.threats);
      onThreatDetected?.(result.threats);
    } else {
      setThreats([]);
    }
    onChange?.(e);
  }, [onChange, onThreatDetected]);

  return (
    <div className="space-y-1.5">
      <input
        {...props}
        value={value}
        onChange={handleChange}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${threats.length > 0 ? "border-red-400 ring-1 ring-red-300" : "border-gray-200"} ${className || ""}`}
        data-testid={props["data-testid"] || "secure-input"}
      />
      {threats.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-2 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            {threats.map((t, i) => <p key={i} className="text-red-700 text-xs">{t}</p>)}
            <p className="text-red-800 text-xs font-semibold mt-0.5">Malicious content may result in a permanent account ban.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function useSecurityScan() {
  const [hasThreat, setHasThreat] = useState(false);
  const [threats, setThreats] = useState<string[]>([]);

  const scan = useCallback((text: string) => {
    const result = scanContent(text);
    setHasThreat(!result.isSafe);
    setThreats(result.threats);
    return result;
  }, []);

  const reset = useCallback(() => {
    setHasThreat(false);
    setThreats([]);
  }, []);

  return { hasThreat, threats, scan, reset };
}
