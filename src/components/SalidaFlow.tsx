'use client';

import { useState } from 'react';
import Image from 'next/image';
import TenantLookupStep from '@/components/steps/TenantLookupStep';
import WarehouseSelectionStep from '@/components/steps/WarehouseSelectionStep';
import OutForm from '@/components/OutForm';
import type { TenantUnitsResponse, PrefilledFormData } from '@/types/tenant';

// Pasos del flujo de salida
type FlowStep = 'lookup' | 'pending-balance' | 'warehouse-selection' | 'form';

// Formateador de moneda panameña
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(amount);

export default function SalidaFlow() {
  const [step, setStep] = useState<FlowStep>('lookup');
  const [tenantData, setTenantData] = useState<TenantUnitsResponse | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  // prefilledData se define ahora para estar listo cuando OutForm lo acepte
  const [prefilledData, setPrefilledData] = useState<PrefilledFormData | null>(null);

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
  };

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

            {/* Botón pago online */}
            <a
              href="https://pagos.almacenajes.net"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-6 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors text-center mb-4"
            >
              Ir a Pago Online
            </a>

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
      </div>
    </div>
  );
}