'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getLogs, updateLog, removeLog, clearSuccessfulLogs } from '@/lib/form-logs';
import type { FormLog, LogStatus } from '@/lib/form-logs';
import { buildEmailTemplateParams } from '@/lib/email-template';

const STATUS_CLASS: Record<LogStatus, string> = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-600',
};

function StatusBadge({ status }: { status: LogStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASS[status]}`}>
      {status === 'success' ? 'Enviado' : status === 'failed' ? 'Fallido' : 'Pendiente'}
    </span>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<FormLog[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);

  const refresh = useCallback(() => setLogs(getLogs()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function retryBackend(log: FormLog) {
    setRetrying(`${log.id}-backend`);
    try {
      const res = await fetch('/api/crm-salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log.payload),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      updateLog(log.id, {
        backendStatus: 'success',
        failedStep: log.emailjsStatus === 'success' ? null : 'emailjs',
        retryCount: (log.retryCount || 0) + 1,
        lastRetryAt: new Date().toISOString(),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      updateLog(log.id, {
        backendStatus: 'failed',
        errorMessage: errMsg,
        retryCount: (log.retryCount || 0) + 1,
        lastRetryAt: new Date().toISOString(),
      });
    }
    refresh();
    setRetrying(null);
  }

  async function retryEmailjs(log: FormLog) {
    setRetrying(`${log.id}-emailjs`);
    try {
      // Construye templateParams con el mapeo correcto camelCase → snake_case.
      // El spread directo de log.payload enviaba campos en camelCase que la plantilla no reconoce.
      const templateParams = buildEmailTemplateParams(log.payload);
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateParams),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error ?? 'Error desconocido');
      }
      updateLog(log.id, {
        emailjsStatus: 'success',
        failedStep: log.backendStatus === 'success' ? null : 'backend',
        retryCount: (log.retryCount || 0) + 1,
        lastRetryAt: new Date().toISOString(),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      updateLog(log.id, {
        emailjsStatus: 'failed',
        errorMessage: errMsg,
        retryCount: (log.retryCount || 0) + 1,
        lastRetryAt: new Date().toISOString(),
      });
    }
    refresh();
    setRetrying(null);
  }

  function handleRemove(id: string) {
    removeLog(id);
    refresh();
  }

  function handleClearSuccessful() {
    clearSuccessfulLogs();
    refresh();
  }

  return (
    <div className="min-h-dvh bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              ← Volver al formulario
            </Link>
            <h1 className="text-lg font-bold text-gray-800">Logs de envíos</h1>
            {logs.length > 0 && (
              <span className="text-xs text-gray-400">{logs.length} registro{logs.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <button
            onClick={handleClearSuccessful}
            className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Limpiar exitosos
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">No hay registros de envío.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {String(log.payload.nombrePersona || '—')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {String(log.payload.correoPersona || '')}
                      {log.payload.sucursal ? ` · ${String(log.payload.sucursal)}` : ''}
                      {log.payload.numeroLocal ? ` · Local ${String(log.payload.numeroLocal)}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.timestamp).toLocaleString('es-PA')}
                      {log.retryCount > 0 && (
                        <span className="ml-2 text-orange-500">· {log.retryCount} reintento{log.retryCount > 1 ? 's' : ''}</span>
                      )}
                    </p>
                    {log.errorMessage && (
                      <p className="text-xs text-red-500 mt-1 line-clamp-2">{log.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 shrink-0">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs text-gray-400">Backend</span>
                      <StatusBadge status={log.backendStatus} />
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs text-gray-400">EmailJS</span>
                      <StatusBadge status={log.emailjsStatus} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {log.backendStatus === 'failed' && (
                      <button
                        onClick={() => retryBackend(log)}
                        disabled={retrying === `${log.id}-backend`}
                        className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {retrying === `${log.id}-backend` ? 'Enviando...' : 'Reenviar Backend'}
                      </button>
                    )}
                    {log.emailjsStatus === 'failed' && (
                      <button
                        onClick={() => retryEmailjs(log)}
                        disabled={retrying === `${log.id}-emailjs`}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {retrying === `${log.id}-emailjs` ? 'Enviando...' : 'Reenviar Email'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(log.id)}
                      className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
