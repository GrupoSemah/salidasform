'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { createPaymentSession } from '@/lib/api';
import type { TenantUnit } from '@/types/tenant';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  unitsWithBalance: TenantUnit[];
  totalPending: number;
}

type ModalPhase = 'idle' | 'loading' | 'error';

// Formateador de moneda panameña
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(amount);

// Segunda capa de defensa: aunque el endpoint /api/create-payment-session ya
// valida esquema y origin del lado del servidor, no confiamos ciegamente en
// el valor recibido antes de una navegación de página completa.
const isSafeRedirectUrl = (rawUrl: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && !isProduction);
};

export default function PaymentModal({
  isOpen,
  onClose,
  tenantId,
  unitsWithBalance,
  totalPending,
}: PaymentModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('idle');

  // siteCode = locationId crudo (formato L001-L011) de las unidades con saldo.
  // Edge case: si el tenant tiene saldo en más de una sucursal (locationId distinto
  // entre unidades), no asumimos cuál usar — bloqueamos el pago en línea y pedimos
  // contactar a la sucursal, ya que PonlineV2 espera un único siteCode por sesión.
  const siteCodes = useMemo(
    () => Array.from(new Set(unitsWithBalance.map((unit) => unit.locationId))),
    [unitsWithBalance]
  );
  const isMultiSite = siteCodes.length > 1;
  const siteCode = siteCodes[0];

  // Reiniciar el estado del modal cada vez que se abre
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
    }
  }, [isOpen]);

  // Cerrar con Escape (deshabilitado mientras se prepara el pago)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'loading') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, phase, onClose]);

  // Bloquear el scroll del fondo mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (phase !== 'loading') onClose();
  };

  const handleContinue = async () => {
    if (isMultiSite || phase === 'loading' || !siteCode) return;

    setPhase('loading');

    try {
      const { sessionUrl } = await createPaymentSession(tenantId, siteCode);
      if (!isSafeRedirectUrl(sessionUrl)) {
        setPhase('error');
        return;
      }
      // Redirect top-level: el flujo de pago (Clave/Yappy) requiere navegación
      // completa, nunca pestaña nueva ni iframe.
      window.location.href = sessionUrl;
    } catch {
      setPhase('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Diálogo */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8"
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          disabled={phase === 'loading'}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {phase === 'loading' ? (
          // Estado: preparando la sesión de pago
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" aria-hidden="true" />
            <p className="text-gray-700 font-medium">Preparando tu pago…</p>
          </div>
        ) : (
          <>
            <h2 id="payment-modal-title" className="text-xl font-bold text-gray-900 mb-1 pr-6">
              Ir a Pago Online
            </h2>
            <p className="text-xs text-gray-400 font-mono mb-5">Tenant ID: {tenantId}</p>

            {/* Resumen de bodegas con saldo */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-4 space-y-2">
              {unitsWithBalance.map((unit) => (
                <div key={unit.unitNumber} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {unit.unitNumber}{' '}
                    <span className="text-gray-400 text-xs">({unit.locationId})</span>
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(unit.currentBalance)}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total pendiente</span>
                <span className="text-lg font-extrabold text-red-700">
                  {formatCurrency(totalPending)}
                </span>
              </div>
            </div>

            {isMultiSite ? (
              // Edge case: saldo repartido en más de una sucursal — no se puede
              // generar una única sesión de pago, se bloquea y se pide contactar
              // directamente a la sucursal.
              <div className="flex items-start gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-yellow-800 leading-relaxed">
                  Tu cuenta tiene saldo pendiente en más de una sucursal. Por el momento no
                  podemos procesar este pago combinado en línea. Por favor contacta a tu
                  sucursal para completarlo.
                </p>
              </div>
            ) : (
              <>
                {phase === 'error' && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-700 leading-relaxed">
                      No pudimos iniciar el pago, intenta de nuevo.
                    </p>
                  </div>
                )}

                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Serás dirigido al pago seguro de Almacenajes Online.
                </p>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
                >
                  Continuar al pago seguro
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
