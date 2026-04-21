'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { outFormSchema, OutFormData } from '@/types';
import type { PrefilledFormData } from '@/types/tenant';
import { SUCURSALES, MOTIVOS_DESOCUPACION, DESTINO_BIENES, CONSIDERACION_CAMBIO, CALIFICACION_EXPERIENCIA, RECOMENDACION } from '@/constants';
import { User, Building2, Send, Info } from 'lucide-react';
import emailjs from '@emailjs/browser';
import DOMPurify from 'dompurify';
import SignaturePad from './ui/SignaturePad';
import SuccessMessage from './ui/SuccessMessage';
import { sendToCRMTracker } from '@/lib/api';

interface OutFormProps {
  prefilledData?: PrefilledFormData;
}

export default function OutForm({ prefilledData }: OutFormProps = {}) {
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'juridica'>('natural');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentDate, setCurrentDate] = useState({ day: '', month: '', year: '' });
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [signature, setSignature] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const RATE_LIMIT_MS = 3000; // 3 segundos entre envíos

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<OutFormData>({
    resolver: zodResolver(outFormSchema),
    mode: 'onSubmit',
    shouldUnregister: false, // Mantener valores aunque inputs estén ocultos
    defaultValues: {
      tipoPersona: 'natural',
      tipoCuenta: 'corriente',
      nombreCuenta: '',
      banco: '',
      numeroCuenta: '',
      nombreFirma: '',
      telefonoFirma: '',
      firmaDigital: ''
    }
  });

  // Establecer fecha actual automáticamente
  useEffect(() => {
    const now = new Date();
    const day = now.getDate().toString();
    const month = now.toLocaleString('es-ES', { month: 'long' });
    const year = now.getFullYear().toString().slice(-2);

    setCurrentDate({ day, month, year });
    
    // Establecer valores en el formulario
    setValue('fechaDocumento', day);
    setValue('mesDocumento', month);
    setValue('anoDocumento', year);
  }, [setValue]);

  // Pre-llenar campos del formulario con datos del tenant (paso anterior)
  useEffect(() => {
    if (!prefilledData) return;
    setValue('tenantId', prefilledData.tenantId);
    setValue('nombrePersona', prefilledData.nombrePersona);
    setValue('correoPersona', prefilledData.correoPersona);
    setValue('cedulaPersona', prefilledData.cedulaPersona);
    setValue('sucursal', prefilledData.sucursal);
    setValue('numeroLocal', prefilledData.numeroLocal);
  }, [prefilledData, setValue]);

  // Auto-calcular fecha de desocupación: siempre el último día del mes siguiente
  useEffect(() => {
    const now = new Date();
    // new Date(año, mes+2, 0) = día 0 del mes siguiente al próximo = último día del próximo mes
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const formatted = lastDay.toISOString().split('T')[0]; // "YYYY-MM-DD"
    setValue('fechaDesocupacion', formatted);
  }, [setValue]);

  // Función para sanitizar strings
  const sanitizeInput = (input: string | undefined): string => {
    if (!input) return '';
    return DOMPurify.sanitize(input.trim());
  };

  // Función para logging seguro de errores
  const logSecureError = (error: unknown, context: string) => {
    // Solo loggear información no sensible en producción
    console.warn(`[${context}] Error de sistema:`, {
      timestamp: new Date().toISOString(),
      context,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
  };

  const onSubmit = useCallback(async (data: OutFormData) => {
    console.log('=== INICIO onSubmit ===');
    console.log('Device:', /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP');
    
    // Limpiar mensaje de error previo
    setErrorMessage('');
    
    // Rate limiting check
    const now = Date.now();
    if (now - lastSubmitTime < RATE_LIMIT_MS) {
      logSecureError(new Error('Rate limit exceeded'), 'RATE_LIMIT');
      setErrorMessage('Por favor, espere unos segundos antes de enviar nuevamente.');
      return;
    }
    
    // Debug: ver los datos que se están enviando
    console.log('Datos del formulario:', data);
    
    // Validar variables de entorno
    if (!process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 
        !process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 
        !process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) {
      console.error('Error: Variables de entorno de EmailJS no configuradas');
      setErrorMessage('Error de configuración del sistema. Por favor, contacte al administrador.');
      return;
    }
    
    setIsSubmitting(true);
    setLastSubmitTime(now);
    
    try {
      const sucursal = SUCURSALES.find(s => s.id === data.sucursal);
      const emailsDestino = sucursal?.emails || ['info@almacenajes.net'];

      // Incluir la firma directamente como imagen inline en el email
      let firmaDigitalParam = '';
      
      if (signature && signature !== '') {
        try {
          // Verificar que la firma no sea demasiado grande (aprox 30KB max)
          const sizeInBytes = (signature.length * 3) / 4;
          if (sizeInBytes > 30000) {
            console.warn('Signature too large, sending text confirmation only');
            firmaDigitalParam = 'Firma digital incluida en el formulario original';
          } else {
            // Incluir la imagen completa con data URI para mostrar inline
            firmaDigitalParam = signature;
          }
        } catch (sigError) {
          console.error('Signature processing error:', sigError);
          firmaDigitalParam = 'Firma digital incluida en el formulario original';
        }
      } else {
        firmaDigitalParam = 'No se incluyó firma digital';
      }

      // Sanitizar todos los inputs antes del envío
      const templateParams = {
        emails: emailsDestino.join(','),
        sucursal_nombre: sucursal?.nombre || 'No especificada',
        tipo_persona: data.tipoPersona === 'natural' ? 'Persona Natural' : 'Persona Jurídica',
        fecha_documento: `${sanitizeInput(data.fechaDocumento)}/${sanitizeInput(data.mesDocumento)}/${sanitizeInput(data.anoDocumento)}`,
        nombre_persona: sanitizeInput(data.nombrePersona),
        correo_persona: sanitizeInput(data.correoPersona),
        cedula_persona: sanitizeInput(data.cedulaPersona),
        numero_local: sanitizeInput(data.numeroLocal),
        tenant_id: sanitizeInput(data.tenantId),
        fecha_desocupacion: sanitizeInput(data.fechaDesocupacion),
        motivo_desocupacion: sanitizeInput(data.motivoDesocupacion),
        destino_bienes: sanitizeInput(data.destinoBienes),
        consideracion_cambio: sanitizeInput(data.consideracionCambio),
        calificacion_experiencia: sanitizeInput(data.calificacionExperiencia),
        recomendacion: sanitizeInput(data.recomendacion),
        nombre_empresa: sanitizeInput(data.nombreEmpresa) || 'N/A',
        ruc_empresa: sanitizeInput(data.rucEmpresa) || 'N/A',
        nombre_cuenta: sanitizeInput(data.nombreCuenta) || 'No especificado',
        banco: sanitizeInput(data.banco) || 'No especificado',
        tipo_cuenta: data.tipoCuenta ? (data.tipoCuenta === 'corriente' ? 'Corriente' : 'Ahorro') : 'No especificado',
        numero_cuenta: sanitizeInput(data.numeroCuenta) || 'No especificado',
        nombre_firma: sanitizeInput(data.nombreFirma),
        telefono_firma: sanitizeInput(data.telefonoFirma),
        fecha_envio: new Date().toLocaleString('es-PA'),
        // Incluir firma directamente en el template como imagen inline
        firma_digital: firmaDigitalParam,
      };

      // Timeout para EmailJS (15 segundos debido al attachment)
      const emailPromise = emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        templateParams,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 15000)
      );
      
      await Promise.race([emailPromise, timeoutPromise]);

      // Email enviado exitosamente
      console.log('Email enviado exitosamente');

      // Registrar en CRM Tracker — awaited para detectar fallos
      try {
        await sendToCRMTracker(data);
        sessionStorage.removeItem('crmWarning');
      } catch (crmErr) {
        // El email ya llegó — no bloqueamos al usuario, pero dejamos aviso
        console.error('❌ Error al registrar en CRM Tracker:', crmErr);
        sessionStorage.setItem('crmWarning', 'true');
      }

      console.log('Redirigiendo...');
      const allowedUrls = ['/thanks'];
      const targetUrl = '/thanks';
      if (allowedUrls.includes(targetUrl)) {
        window.location.href = targetUrl;
      }
    } catch (error) {
      console.error('Email Send Error:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      logSecureError(error, 'EMAIL_SEND');
      
      // Mostrar error en la UI sin limpiar los campos
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setErrorMessage(`Error al enviar el formulario: ${errorMsg}. Por favor, intente nuevamente.`);
      
      // NO limpiar el formulario cuando hay error - mantener los valores
      // NO redirigir automáticamente - dejar que el usuario vea el error y decida
      console.log('Formulario NO enviado. Los datos se mantienen para que pueda reintentar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [lastSubmitTime, signature]);

  const handleTipoPersonaChange = (tipo: 'natural' | 'juridica') => {
    setTipoPersona(tipo);
    setValue('tipoPersona', tipo);
    
    // Limpiar campos específicos de persona jurídica si se cambia a natural
    if (tipo === 'natural') {
      setValue('nombreEmpresa', '');
      setValue('rucEmpresa', '');
    }
  };

  const handleSignatureChange = (signatureData: string) => {
    setSignature(signatureData);
    setValue('firmaDigital', signatureData);
  };

  const handleNewForm = () => {
    setIsSubmitted(false);
    reset();
    setTipoPersona('natural');
  };

  const onError = (validationErrors: Record<string, unknown>) => {
    console.log('Errores de validación:', validationErrors);
    setErrorMessage('Por favor, complete todos los campos requeridos correctamente.');
    // Limpiar el mensaje de error después de 5 segundos
    setTimeout(() => {
      setErrorMessage('');
    }, 5000);
  };

  if (isSubmitted) {
    return <SuccessMessage onNewForm={handleNewForm} />;
  }

  // Indica si los campos de identidad vienen pre-llenados del flujo de tenant
  const isPrefilled = !!prefilledData;

  const sucursalOptions = SUCURSALES.map(s => ({ value: s.id, label: s.nombre }));

  return (
    <div className="min-h-dvh bg-gray-50 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-0">

            {/* Sección: Fecha del documento */}
            <div className="px-6 sm:px-8 py-6">
              <div className="text-right text-sm sm:text-base text-gray-800">
                <div className="flex flex-wrap justify-end items-center gap-1">
                  <span className="text-gray-800">Panama,</span>
                  <span className="border-b border-orange-400 w-12 sm:w-16 text-center font-medium text-orange-600">
                    {currentDate.day}
                  </span>
                  <span className="text-gray-800">de</span>
                  <span className="border-b border-orange-400 w-20 sm:w-24 text-center font-medium text-orange-600">
                    {currentDate.month}
                  </span>
                  <span className="text-gray-800">de 20</span>
                  <span className="border-b border-orange-400 w-10 sm:w-12 text-center font-medium text-orange-600">
                    {currentDate.year}
                  </span>
                  {/* Campos ocultos para el formulario */}
                  <input {...register('fechaDocumento')} type="hidden" />
                  <input {...register('mesDocumento')} type="hidden" />
                  <input {...register('anoDocumento')} type="hidden" />
                </div>
              </div>

              {/* Destinatario */}
              <div className="mt-6">
                <p className="font-semibold text-sm sm:text-base text-gray-800">Senores</p>
                <p className="font-semibold text-sm sm:text-base text-gray-800">Almacenajes Minidepositos</p>
                <p className="mt-4 text-sm sm:text-base text-gray-800">Estimados Senores:</p>
              </div>
            </div>

            {/* Sección: Tipo de Persona */}
            <div className="px-6 sm:px-8 py-6 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Tipo de persona</p>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleTipoPersonaChange('natural')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors cursor-pointer ${
                    tipoPersona === 'natural' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Persona Natural</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoPersonaChange('juridica')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors cursor-pointer border-l border-gray-200 ${
                    tipoPersona === 'juridica' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Persona Juridica</span>
                </button>
              </div>
            </div>

            {/* Sección: Cuerpo de la carta */}
            <div className="px-6 sm:px-8 py-6 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Datos del solicitante</p>

              {/* Estilos reutilizables para inputs del formulario */}
              <div className="bg-orange-50/30 border border-orange-100 rounded-xl p-4 sm:p-5">
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Por este medio, comunico que estaré desocupando mi local en{' '}
                  <strong className="text-orange-600">Almacenajes Minidepósitos</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre completo</label>
                    <input {...register('nombrePersona')} readOnly={isPrefilled}
                      className={`w-full h-10 px-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${isPrefilled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : errors.nombrePersona ? 'border-red-400 bg-white' : 'border-orange-300 bg-white focus:border-orange-500'}`}
                      placeholder="Nombre completo" />
                    {errors.nombrePersona && <p className="text-red-500 text-xs mt-1">&#9888; {errors.nombrePersona.message}</p>}
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Correo electrónico</label>
                    <input {...register('correoPersona')} type="email" readOnly={isPrefilled}
                      className={`w-full h-10 px-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${isPrefilled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : errors.correoPersona ? 'border-red-400 bg-white' : 'border-orange-300 bg-white focus:border-orange-500'}`}
                      placeholder="correo@ejemplo.com" />
                    {errors.correoPersona && <p className="text-red-500 text-xs mt-1">&#9888; {errors.correoPersona.message}</p>}
                  </div>

                  {/* Cédula */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cédula de identidad</label>
                    <input {...register('cedulaPersona')} readOnly={isPrefilled}
                      className={`w-full h-10 px-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${isPrefilled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : errors.cedulaPersona ? 'border-red-400 bg-white' : 'border-orange-300 bg-white focus:border-orange-500'}`}
                      placeholder="Número de cédula" />
                    {errors.cedulaPersona && <p className="text-red-500 text-xs mt-1">&#9888; {errors.cedulaPersona.message}</p>}
                  </div>

                  {/* Número de local */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Número de local</label>
                    <input {...register('numeroLocal')} readOnly={isPrefilled}
                      className={`w-full h-10 px-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${isPrefilled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : errors.numeroLocal ? 'border-red-400 bg-white' : 'border-orange-300 bg-white focus:border-orange-500'}`}
                      placeholder="Ej. AA40" />
                    {errors.numeroLocal && <p className="text-red-500 text-xs mt-1">&#9888; {errors.numeroLocal.message}</p>}
                  </div>

                  {/* Campos extra para persona jurídica */}
                  {tipoPersona === 'juridica' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la empresa</label>
                        <input {...register('nombreEmpresa')}
                          className="w-full h-10 px-3 rounded-lg border border-orange-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-500"
                          placeholder="Razón social" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">RUC</label>
                        <input {...register('rucEmpresa')}
                          className="w-full h-10 px-3 rounded-lg border border-orange-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-500"
                          placeholder="Número de RUC" />
                      </div>
                    </>
                  )}

                  {/* Tenant ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tenant ID</label>
                    <input {...register('tenantId')} readOnly={isPrefilled}
                      className={`w-full h-10 px-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${isPrefilled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-orange-300 bg-white focus:border-orange-500'}`}
                      placeholder="123456" />
                  </div>

                  {/* Sucursal */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal</label>
                    <select {...register('sucursal')} disabled={isPrefilled}
                      className={`w-full h-10 px-3 rounded-lg border text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-400 ${isPrefilled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-orange-300 bg-white focus:border-orange-500'}`}>
                      <option value="">Seleccione una sucursal...</option>
                      {sucursalOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha de desocupación — ocupa las 2 columnas */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha aproximada de desocupación</label>
                    <input {...register('fechaDesocupacion')} type="date" readOnly
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-100 text-sm text-gray-500 cursor-not-allowed focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Encuesta de salida */}
            <div className="px-6 sm:px-8 py-6 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Encuesta de salida</p>

              <div className="space-y-4 bg-gray-50 rounded-xl p-4 sm:p-5">
                {/* Motivo de desocupacion */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Que le motivo a considerar desocupar su deposito?</label>
                  <select {...register('motivoDesocupacion')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 bg-white appearance-none">
                    <option value="" className="text-gray-500">Seleccione una opcion...</option>
                    {MOTIVOS_DESOCUPACION.map(motivo => (
                      <option key={motivo} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                  {errors.motivoDesocupacion && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">&#9888; {errors.motivoDesocupacion.message}</p>
                  )}
                </div>

                {/* Destino de bienes */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Que hizo con las pertenencias que tenia en el deposito?</label>
                  <select {...register('destinoBienes')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 bg-white appearance-none">
                    <option value="" className="text-gray-500">Seleccione una opcion...</option>
                    {DESTINO_BIENES.map(destino => (
                      <option key={destino} value={destino}>{destino}</option>
                    ))}
                  </select>
                  {errors.destinoBienes && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">&#9888; {errors.destinoBienes.message}</p>
                  )}
                </div>

                {/* Consideracion de cambio */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Antes de desocupar, considero reducir el tamano del deposito o cambiar de unidad?</label>
                  <select {...register('consideracionCambio')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 bg-white appearance-none">
                    <option value="" className="text-gray-500">Seleccione una opcion...</option>
                    {CONSIDERACION_CAMBIO.map(opcion => (
                      <option key={opcion} value={opcion}>{opcion}</option>
                    ))}
                  </select>
                  {errors.consideracionCambio && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">&#9888; {errors.consideracionCambio.message}</p>
                  )}
                </div>

                {/* Calificacion de experiencia */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">En general, como calificaria su experiencia con nosotros?</label>
                  <select {...register('calificacionExperiencia')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 bg-white appearance-none">
                    <option value="" className="text-gray-500">Seleccione una opcion...</option>
                    {CALIFICACION_EXPERIENCIA.map(calificacion => (
                      <option key={calificacion} value={calificacion}>{calificacion}</option>
                    ))}
                  </select>
                  {errors.calificacionExperiencia && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">&#9888; {errors.calificacionExperiencia.message}</p>
                  )}
                </div>

                {/* Recomendacion */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Si alguien cercano a usted necesitara un minidepósito, ¿nos recomendaría?</label>
                  <select {...register('recomendacion')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 bg-white appearance-none">
                    <option value="" className="text-gray-500">Seleccione una opcion...</option>
                    {RECOMENDACION.map(opcion => (
                      <option key={opcion} value={opcion}>{opcion}</option>
                    ))}
                  </select>
                  {errors.recomendacion && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">&#9888; {errors.recomendacion.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección: Datos bancarios */}
            <div className="px-6 sm:px-8 py-6 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Datos bancarios</p>

              <p className="mb-4 text-sm text-gray-800">
                Asimismo, autorizo a <strong className="text-orange-600">Almacenajes Minidepositos</strong> a realizar la devolucion correspondiente que se tenga a mi favor, <u>en caso de aplicar</u>, mediante transferencia a la cuenta bancaria detallada a continuacion:
              </p>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
                <div className="flex items-start gap-2 mb-4">
                  <Info className="w-4 h-4 text-blue-800 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800">
                    Campos <strong>opcionales</strong>. Complete solo si desea una devolucion mediante transferencia bancaria.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Nombre de la Cuenta <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                    </label>
                    <input {...register('nombreCuenta')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 placeholder:text-gray-400 bg-white" placeholder="Nombre completo del titular" />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Banco <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                    </label>
                    <input {...register('banco')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 placeholder:text-gray-400 bg-white" placeholder="Nombre del banco" />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Tipo de Cuenta <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                    </label>
                    <div className="flex sm:flex-row flex-col sm:space-x-4 space-y-2 sm:space-y-0 mt-2">
                      <label className="flex items-center cursor-pointer">
                        <input {...register('tipoCuenta')} type="radio" value="corriente" className="mr-2 w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                        <span className="text-sm text-gray-800">Corriente</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input {...register('tipoCuenta')} type="radio" value="ahorro" className="mr-2 w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                        <span className="text-sm text-gray-800">Ahorro</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      No. De Cuenta <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                    </label>
                    <input {...register('numeroCuenta')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 placeholder:text-gray-400 bg-white" placeholder="Numero de cuenta" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Firma */}
            <div className="px-6 sm:px-8 py-6 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Firma del solicitante</p>

              <p className="text-base text-gray-700 font-medium italic mb-6">Atentamente,</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Nombre:</label>
                  <input {...register('nombreFirma')} className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 placeholder:text-gray-400 bg-white" placeholder="Nombre completo" />
                  {errors.nombreFirma && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">&#9888; {errors.nombreFirma.message}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Telefono:</label>
                  <input {...register('telefonoFirma')} type="tel" className="border border-gray-200 w-full h-11 px-3 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-gray-900 placeholder:text-gray-400 bg-white" placeholder="Ej. 6000-0000" />
                  {errors.telefonoFirma && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">&#9888; {errors.telefonoFirma.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <SignaturePad onSignatureChange={handleSignatureChange} width={280} height={140} />
                </div>
              </div>
            </div>

            {/* Sección: Error global + Submit */}
            <div className="px-6 sm:px-8 py-6 bg-gray-50/80 border-t border-gray-100">
              {/* Mostrar error si existe */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error al procesar formulario</h3>
                      <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 px-8 rounded-xl font-semibold flex items-center justify-center mx-auto transition-colors shadow-md hover:shadow-lg text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span>Enviar Formulario</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
