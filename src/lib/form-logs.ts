export type LogStatus = 'success' | 'failed' | 'pending';
export type FailedStep = 'backend' | 'emailjs' | 'both' | null;

export interface FormLog {
  id: string;
  timestamp: string;
  formType: 'salida';
  payload: Record<string, unknown>;
  backendStatus: LogStatus;
  emailjsStatus: LogStatus;
  failedStep: FailedStep;
  retryCount: number;
  lastRetryAt?: string;
  errorMessage?: string;
}

const STORAGE_KEY = 'amd_form_logs_salida';

function readAll(): FormLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FormLog[]) : [];
  } catch {
    return [];
  }
}

function writeAll(logs: FormLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // localStorage lleno o bloqueado — sin crash
  }
}

export function saveLog(log: FormLog): void {
  const logs = readAll();
  logs.unshift(log); // más reciente primero
  writeAll(logs);
}

export function getLogs(): FormLog[] {
  return readAll();
}

export function updateLog(id: string, updates: Partial<FormLog>): void {
  const logs = readAll();
  const idx = logs.findIndex(l => l.id === id);
  if (idx === -1) return;
  logs[idx] = { ...logs[idx], ...updates };
  writeAll(logs);
}

export function removeLog(id: string): void {
  writeAll(readAll().filter(l => l.id !== id));
}

export function clearSuccessfulLogs(): void {
  writeAll(readAll().filter(l => !(l.backendStatus === 'success' && l.emailjsStatus === 'success')));
}
