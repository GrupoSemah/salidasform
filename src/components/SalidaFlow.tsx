'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import TenantLookupStep from '@/components/steps/TenantLookupStep';
import WarehouseSelectionStep from '@/components/steps/WarehouseSelectionStep';
import OutForm from '@/components/OutForm';
import PaymentModal from '@/components/PaymentModal';
import type { TenantUnitsResponse, PrefilledFormData } from '@/types/tenant';
import type { PaymentReturnData } from '@/types/payment';

// Pasos del flujo de salida
type FlowStep = 'lookup' | 'pending-balance' | 'warehouse-selection' | 'form' | 'payment-return';

// Formateador de moneda panameña
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(amount);

export default function SalidaFlow() {
  const [step, setStep] = useState<FlowStep>('lookup');
  const [tenantData, setTenantData] = useState<TenantUnitsResponse | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  // prefilledData se define ahora para estar listo cuando OutForm lo acepte
  const [prefilledData, setPrefilledData] = useState<PrefilledFormData | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnData | null>(null);

  // Detecta el retorno de PonlineV2 vía query params (?status=success|failed|error&ref=...).
  // Se lee window.location directamente (en vez de useSearchParams) para evitar el
  // requisito de Suspense boundary de Next 15 en una ruta que de otro modo es estática.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status === 'success' || status === 'failed' || status === 'error') {
      setPaymentReturn({ status, ref: params.get('ref') });
      setStep('payment-return');
      // Limpiar la URL para que un refresh no vuelva a disparar esta pantalla
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Callback recibido de TenantLookupStep al encontrar el tenant
  const handleLookupSuccess = (data: TenantUnitsResponse) => {
    setTenantData(data);

    // Calcular saldo pendiente total entre todas las unidades
    const totalPending = data.units.reduce((sum, unit) => sum + unit.currentBalance, 0);

    if (totalPending > 0) {
      setPendingAmount(totalPending);
      setStep('pending-balance');
    } else {
      setStep('warehouse-selection');
    }
  };

  // Callback recibido de WarehouseSelectionStep al confirmar selección
  const handleWarehouseContinue = (data: PrefilledFormData) => {
    setPrefilledData(data);
    setStep('form');
  };

  // Reiniciar el flujo al paso de búsqueda
  const resetToLookup = () => {
    setStep('lookup');
    setTenantData(null);
    setPendingAmount(0);
    setPrefilledData(null);
    setPaymentReturn(null);
  };

  // Unidades con saldo pendiente, base para el resumen del modal de pago y el siteCode
  const unitsWithBalance = tenantData?.units.filter((unit) => unit.currentBalance > 0) ?? [];

  // Paso 'form': OutForm maneja su propio layout completo.
  // Si prefilledData es null con step='form' (estado inconsistente), resetear al inicio.
  if (step === 'form') {
    if (!prefilledData) {
      resetToLookup();
      return null;
    }
    return <OutForm prefilledData={prefilledData} />;
  }

  // Pasos 1, 2 y muro de pago: wrapper con fondo crema y cabecera
  return (
    <div className="min-h-screen bg-[#faf5ee] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-lg">
        {/* Cabecera: solo logo centrado */}
        <div className="text-center mb-6">
          <Image
            src="/logo.png"
            alt="Almacenajes Minidepósitos"
            width={180}
            height={180}
            className="mx-auto"
          />
        </div>

        {/* Paso 1: búsqueda de Tenant ID */}
        {step === 'lookup' && (
          <TenantLookupStep onSuccess={handleLookupSuccess} />
        )}

        {/* Muro de pago: saldo pendiente bloquea el avance */}
        {step === 'pending-balance' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            {/* Ícono de advertencia */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Título */}
            <h2 className="text-xl font-bold text-red-600 mb-3">Saldo Pendiente</h2>

            {/* Mensaje */}
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              Estimado cliente, actualmente su cuenta presenta un saldo pendiente de:
            </p>

            {/* Monto destacado */}
            <p className="text-4xl font-extrabold text-red-700 mb-4">
              {formatCurrency(pendingAmount)}
            </p>

            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Para continuar con el registro de su preaviso de salida, es necesario que
              su cuenta se encuentre al día.
            </p>

            {/* Botón pago online: abre el modal de arranque de pago */}
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="block w-full py-3 px-6 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors text-center mb-4"
            >
              Ir a Pago Online
            </button>

            {/* Enlace para intentar con otro Tenant ID */}
            <button
              type="button"
              onClick={resetToLookup}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline-offset-2 hover:underline"
            >
              Intentar con otro Tenant ID
            </button>
          </div>
        )}

        {/* Paso 2: selección de bodegas */}
        {step === 'warehouse-selection' && tenantData && (
          <WarehouseSelectionStep
            tenantData={tenantData}
            onBack={resetToLookup}
            onContinue={handleWarehouseContinue}
          />
        )}

        {/* Pantalla de retorno: el cliente vuelve desde PonlineV2 tras intentar pagar */}
        {step === 'payment-return' && paymentReturn && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            {paymentReturn.status === 'success' && (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" aria-hidden="true" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-green-700 mb-3">¡Pago recibido!</h2>
                <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                  Tu pago fue registrado exitosamente. Ya puedes continuar con tu proceso de salida.
                </p>
              </>
            )}

            {paymentReturn.status === 'failed' && (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-red-700 mb-3">Pago no completado</h2>
                <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                  El pago no pudo completarse. Puedes intentarlo nuevamente cuando gustes.
                </p>
              </>
            )}

            {paymentReturn.status === 'error' && (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" aria-hidden="true" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-yellow-700 mb-3">Ocurrió un problema</h2>
                <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                  No pudimos confirmar el estado de tu pago. Si el cargo fue realizado, no te
                  preocupes: contacta a tu sucursal para verificarlo.
                </p>
              </>
            )}

            {paymentReturn.ref && (
              <p className="text-xs text-gray-400 font-mono mb-6">Referencia: {paymentReturn.ref}</p>
            )}

            <button
              type="button"
              onClick={resetToLookup}
              className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>

      {/* Modal de arranque de pago */}
      {tenantData && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          tenantId={tenantData.tenant.tenantId}
          unitsWithBalance={unitsWithBalance}
          totalPending={pendingAmount}
        />
      )}
    </div>
  );
}