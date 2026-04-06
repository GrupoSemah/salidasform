'use client';

import { useState } from 'react';
import { LOCATION_TO_SUCURSAL } from '@/constants';
import type { TenantUnitsResponse, TenantUnit, PrefilledFormData } from '@/types/tenant';

interface WarehouseSelectionStepProps {
  tenantData: TenantUnitsResponse;
  onBack: () => void;
  onContinue: (prefilledData: PrefilledFormData) => void;
}

// Formateador de moneda panameña
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(amount);

// Formatea una fecha de SiteLink (ISO, MM/DD/YYYY, YYYY-MM-DD) a un string legible (ej. "31 may. 2026")
const formatDate = (raw: string | null): string => {
  if (!raw) return '—';
  try {
    // new Date() maneja strings ISO nativamente; para MM/DD/YYYY también funciona
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return raw;
  }
};

export default function WarehouseSelectionStep({
  tenantData,
  onBack,
  onContinue,
}: WarehouseSelectionStepProps) {
  // Mapa de unidades seleccionadas: unitNumber -> TenantUnit
  const [selectedUnits, setSelectedUnits] = useState<Map<string, TenantUnit>>(new Map());

  const { tenant, units } = tenantData;

  // Alternar selección de una unidad
  const toggleUnit = (unit: TenantUnit) => {
    setSelectedUnits((prev) => {
      const next = new Map(prev);
      if (next.has(unit.unitNumber)) {
        next.delete(unit.unitNumber);
      } else {
        next.set(unit.unitNumber, unit);
      }
      return next;
    });
  };

  const selectedArray = Array.from(selectedUnits.values());
  const hasSelection = selectedArray.length > 0;

  // Construir PrefilledFormData al avanzar
  const handleContinue = () => {
    if (!hasSelection) return;

    const firstUnit = selectedArray[0];
    const sucursal = LOCATION_TO_SUCURSAL[firstUnit.locationId] ?? '';

    const prefilledData: PrefilledFormData = {
      tenantId: tenant.tenantId,
      nombrePersona: tenant.fullName ?? '',
      correoPersona: tenant.email ?? '',
      cedulaPersona: tenant.license ?? '',
      sucursal,
      numeroLocal: selectedArray.map((u) => u.unitNumber).join(', '),
      selectedUnits: selectedArray,
    };

    onContinue(prefilledData);
  };

  return (
    <div className="space-y-4">
      {/* Barra superior: botón volver + tenant ID */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
        >
          {/* Flecha izquierda */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <span className="text-xs text-gray-400 font-mono">
          Tenant ID: {tenant.tenantId}
        </span>
      </div>

      {/* Tarjeta de información del cliente */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Información del Cliente
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
            <p className="text-sm font-medium text-gray-800">
              {tenant.fullName ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Correo</p>
            <p className="text-sm font-medium text-gray-800 break-all">
              {tenant.email ?? '—'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-0.5">Cédula</p>
            <p className="text-sm font-medium text-gray-800">
              {tenant.license ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Sección de selección de bodegas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Seleccione las bodegas a desocupar
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Marque las bodegas que desea desocupar. Puede seleccionar una o varias.
        </p>

        <div className="space-y-3">
          {units.map((unit) => {
            const isChecked = selectedUnits.has(unit.unitNumber);
            return (
              <label
                key={unit.unitNumber}
                className={`block rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                  isChecked
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {/* Fila superior: checkbox + nombre + etiqueta Depósito */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleUnit(unit)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300 cursor-pointer"
                    />
                    <span className="font-bold text-gray-900 text-base">
                      {unit.unitNumber}
                    </span>
                    <span className="text-xs text-gray-400">
                      {unit.locationId} • {unit.unitSize ?? '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-gray-500">Depósito</span>
                    <p className="text-sm font-semibold text-gray-700">
                      {formatCurrency(unit.depositAmount)}
                    </p>
                  </div>
                </div>

                {/* Fila inferior: desglose financiero */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Renta + Seguro + ITBMS (7%)</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formatCurrency(unit.totalMonthlyWithTax)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Pagado hasta</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(unit.paidThru)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Último pago</p>
                    <p
                      className={`text-sm font-medium ${
                        unit.amountDue < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(unit.amountDue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Pago pendiente</p>
                    {unit.currentBalance > 0 ? (
                      <p className="text-sm font-semibold text-red-600">
                        {formatCurrency(unit.currentBalance)}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-green-600">Al día ✓</p>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Chips de bodegas seleccionadas */}
      {hasSelection && (
        <div className="flex flex-wrap gap-2 px-1">
          <span className="text-xs text-gray-500 self-center">Bodegas seleccionadas:</span>
          {selectedArray.map((unit) => (
            <span
              key={unit.unitNumber}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold"
            >
              {unit.unitNumber}
              {unit.unitSize ? ` (${unit.unitSize})` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Botón continuar */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!hasSelection}
        className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuar al Formulario
      </button>
    </div>
  );
}
