'use client';

import { useState } from 'react';
import { getTenantUnits } from '@/lib/api';
import type { TenantUnitsResponse } from '@/types/tenant';

interface TenantLookupStepProps {
  onSuccess: (data: TenantUnitsResponse) => void;
}

export default function TenantLookupStep({ onSuccess }: TenantLookupStepProps) {
  const [tenantId, setTenantId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Solo permite dígitos, máximo 6 caracteres
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTenantId(value);
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validación: exactamente 6 dígitos
    if (tenantId.length !== 6) {
      setErrorMessage('El Tenant ID debe tener exactamente 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await getTenantUnits(tenantId);
      onSuccess(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo encontrar el Tenant ID. Verifique e intente nuevamente.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = isLoading || tenantId.length !== 6;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Título del paso */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Formulario de Salida</h2>
        <p className="text-gray-500 text-sm">Ingrese su Tenant ID para continuar</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Campo Tenant ID */}
        <div className="mb-4">
          <label
            htmlFor="tenantId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tenant ID (6 dígitos)
          </label>
          <input
            id="tenantId"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={tenantId}
            onChange={handleInputChange}
            placeholder="123456"
            disabled={isLoading}
            className={`w-full px-4 py-3 rounded-xl border text-gray-900 text-lg tracking-widest placeholder-gray-300 focus:outline-none focus:ring-2 transition-colors ${
              errorMessage
                ? 'border-red-400 focus:ring-red-200'
                : 'border-gray-200 focus:ring-orange-200 focus:border-orange-400'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          />
          {/* Mensaje de error */}
          {errorMessage && (
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={isButtonDisabled}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              {/* Spinner de carga */}
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Buscando...
            </>
          ) : (
            'Continuar'
          )}
        </button>
      </form>

      {/* Texto de ayuda */}
      <p className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
        El Tenant ID se encuentra en su contrato de arrendamiento o puede consultarlo
        con el personal de su sucursal.
      </p>

    </div>
  );
}