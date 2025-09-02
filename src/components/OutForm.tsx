'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { outFormSchema, OutFormData } from '@/types';
import { SUCURSALES, MOTIVOS_DESOCUPACION, DESTINO_BIENES } from '@/constants';
import { User, Building2, Send } from 'lucide-react';
import emailjs from '@emailjs/browser';
import DOMPurify from 'dompurify';
import SignaturePad from './ui/SignaturePad';
import SuccessMessage from './ui/SuccessMessage';
import { generateFormPDF } from '@/lib/pdfGenerator';

export default function OutForm() {
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'juridica'>('natural');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentDate, setCurrentDate] = useState({ day: '', month: '', year: '' });
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [signature, setSignature] = useState<string>('');
  const RATE_LIMIT_MS = 3000; // 3 segundos entre envíos

  const {
    register,
    handleSubmit,
    reset,
    setValue
  } = useForm<OutFormData>({
    resolver: zodResolver(outFormSchema),
    defaultValues: {
      tipoPersona: 'natural',
      tipoCuenta: 'corriente',
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
    // Rate limiting check
    const now = Date.now();
    if (now - lastSubmitTime < RATE_LIMIT_MS) {
      logSecureError(new Error('Rate limit exceeded'), 'RATE_LIMIT');
      return;
    }
    
    setIsSubmitting(true);
    setLastSubmitTime(now);
    
    try {
      const sucursal = SUCURSALES.find(s => s.id === data.sucursal);
      const emailsDestino = sucursal?.emails || ['info@almacenajes.net'];

      // Generar PDF completo del formulario con firma incluida
      const pdfDataUri = generateFormPDF({ 
        data, 
        signature: signature || undefined 
      });
      
      // Extraer solo la parte base64 del data URI
      const pdfBase64 = pdfDataUri.split(',')[1];
      
      // Crear nombre de archivo único
      const fileName = `Formulario_Desocupacion_${data.numeroLocal || 'SinNumero'}_${Date.now()}.pdf`;

      // Sanitizar todos los inputs antes del envío
      const templateParams = {
        emails: emailsDestino.join(','),
        sucursal_nombre: sucursal?.nombre || 'No especificada',
        tipo_persona: data.tipoPersona === 'natural' ? 'Persona Natural' : 'Persona Jurídica',
        fecha_documento: `${sanitizeInput(data.fechaDocumento)}/${sanitizeInput(data.mesDocumento)}/${sanitizeInput(data.anoDocumento)}`,
        nombre_persona: sanitizeInput(data.nombrePersona),
        cedula_persona: sanitizeInput(data.cedulaPersona),
        numero_local: sanitizeInput(data.numeroLocal),
        tenant_id: sanitizeInput(data.tenantId),
        fecha_desocupacion: sanitizeInput(data.fechaDesocupacion),
        motivo_desocupacion: sanitizeInput(data.motivoDesocupacion),
        destino_bienes: sanitizeInput(data.destinoBienes),
        nombre_empresa: sanitizeInput(data.nombreEmpresa) || 'N/A',
        ruc_empresa: sanitizeInput(data.rucEmpresa) || 'N/A',
        nombre_cuenta: sanitizeInput(data.nombreCuenta),
        banco: sanitizeInput(data.banco),
        tipo_cuenta: data.tipoCuenta === 'corriente' ? 'Corriente' : 'Ahorro',
        numero_cuenta: sanitizeInput(data.numeroCuenta),
        nombre_firma: sanitizeInput(data.nombreFirma),
        fecha_envio: new Date().toLocaleString('es-PA'),
        // Incluir el PDF como attachment
        attachment_name: fileName,
        attachment_content: pdfBase64,
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

      // Validación de redirect seguro
      const allowedUrls = ['/thanks'];
      const targetUrl = '/thanks';
      if (allowedUrls.includes(targetUrl)) {
        window.location.href = targetUrl;
      }
    } catch (error) {
      logSecureError(error, 'EMAIL_SEND');
      // Redirigir a página de error de forma segura
      const errorUrl = '/resendmessage';
      const allowedErrorUrls = ['/resendmessage'];
      if (allowedErrorUrls.includes(errorUrl)) {
        window.location.href = errorUrl;
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [lastSubmitTime, signature]);

  const handleTipoPersonaChange = (tipo: 'natural' | 'juridica') => {
    setTipoPersona(tipo);
    setValue('tipoPersona', tipo);
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

  if (isSubmitted) {
    return <SuccessMessage onNewForm={handleNewForm} />;
  }

  const sucursalOptions = SUCURSALES.map(s => ({ value: s.id, label: s.nombre }));

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-4 sm:p-6 lg:p-8 border border-gray-200 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Fecha del documento - Auto-generada */}
            <div className="text-right mb-6 text-sm sm:text-base text-gray-800">
              <div className="flex flex-wrap justify-end items-center gap-1">
                <span className="text-gray-800">Panamá,</span>
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
            <div className="mb-6">
              <p className="font-semibold text-sm sm:text-base text-gray-800">Señores</p>
              <p className="font-semibold text-sm sm:text-base text-gray-800">Almacenajes Minidepósitos</p>
              <p className="mt-4 text-sm sm:text-base text-gray-800">Estimados Señores:</p>
            </div>

            {/* Tipo de Persona */}
            <div className="mb-6 p-4 bg-orange-50 rounded-md border border-orange-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Seleccione el tipo de persona:</p>
              <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-3 sm:space-y-0">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="natural" checked={tipoPersona === 'natural'} onChange={() => handleTipoPersonaChange('natural')} className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                  <User className="w-5 h-5 ml-2 mr-2 text-orange-600" />
                  <span className="text-sm sm:text-base text-gray-800">Persona Natural</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="juridica" checked={tipoPersona === 'juridica'} onChange={() => handleTipoPersonaChange('juridica')} className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                  <Building2 className="w-5 h-5 ml-2 mr-2 text-orange-600" />
                  <span className="text-sm sm:text-base text-gray-800">Persona Jurídica</span>
                </label>
              </div>
            </div>

            {/* Contenido del formulario */}
            <div className="mb-8 leading-relaxed text-sm sm:text-base">
              {tipoPersona === 'natural' ? (
                <div className="space-y-4">
                  {/* Layout mobile vs desktop */}
                  <div className="block sm:hidden space-y-3">
                    {/* Mobile: Cada línea separada */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">Por este medio, yo,</span>
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="nombre completo" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">con cédula de identidad personal número</span>
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="número de cédula" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, quien mantiene alquilado el local</span>
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-1 px-1 min-w-[60px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="número" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, Tenant ID</span>
                      <input {...register('tenantId')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="Tenant ID" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal</span>
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500">
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, comunico que estaremos desocupando dicho local aproximadamente el día</span>
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-1 px-1 focus:border-orange-600 focus:outline-none bg-transparent text-gray-800" />
                      <span className="text-gray-800 font-medium">.</span>
                    </div>
                  </div>

                  {/* Desktop: Párrafo fluido */}
                  <div className="hidden sm:block">
                    <p className="leading-relaxed text-gray-800">
                      Por este medio, yo, 
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="nombre completo" />
                      con cédula de identidad personal número 
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="número de cédula" />
                      , quien mantiene alquilado el local 
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-2 px-1 w-20 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="número" />
                      , Tenant ID 
                      <input {...register('tenantId')} className="border-b border-orange-400 mx-2 px-1 w-32 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="Tenant ID" />
                      en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal 
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-2 px-1 w-40 focus:border-orange-600 focus:outline-none bg-transparent inline-block">
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      , comunico que estaremos desocupando dicho local aproximadamente el día 
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block text-gray-800" />
                      .
                    </p>
                  </div>
                  
                  {/* Dropdown para motivo de desocupación */}
                  <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">El motivo por el cual desocupo el local es:</label>
                    <select {...register('motivoDesocupacion')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base placeholder:text-gray-500">
                      <option value="" className="text-gray-500">Seleccione el motivo...</option>
                      {MOTIVOS_DESOCUPACION.map(motivo => (
                        <option key={motivo} value={motivo}>{motivo}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Layout mobile vs desktop para Persona Jurídica */}
                  <div className="block sm:hidden space-y-3">
                    {/* Mobile: Cada línea separada */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">Por este medio, yo,</span>
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="nombre completo" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">con cédula de identidad personal número</span>
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="número de cédula" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, actuando en mi condición de Representante Legal de la Empresa</span>
                      <input {...register('nombreEmpresa')} className="border-b border-orange-400 mx-1 px-1 min-w-[150px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="nombre de la empresa" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, con RUC</span>
                      <input {...register('rucEmpresa')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="número de RUC" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, quien mantiene alquilado el local</span>
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-1 px-1 min-w-[60px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="número" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, Tenant ID</span>
                      <input {...register('tenantId')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500" placeholder="Tenant ID" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal</span>
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent placeholder:text-gray-500">
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, comunico que estaremos desocupando dicho local aproximadamente el día</span>
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-1 px-1 focus:border-orange-600 focus:outline-none bg-transparent text-gray-800" />
                      <span className="text-gray-800 font-medium">.</span>
                    </div>
                  </div>

                  {/* Desktop: Párrafo fluido para Persona Jurídica */}
                  <div className="hidden sm:block">
                    <p className="leading-relaxed text-gray-800">
                      Por este medio, yo, 
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="nombre completo" />
                      con cédula de identidad personal número 
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="número de cédula" />
                      , actuando en mi condición de Representante Legal de la Empresa 
                      <input {...register('nombreEmpresa')} className="border-b border-orange-400 mx-2 px-1 w-56 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="nombre de la empresa" />
                      , con RUC 
                      <input {...register('rucEmpresa')} className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="número de RUC" />
                      , quien mantiene alquilado el local 
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-2 px-1 w-20 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="número" />
                      , Tenant ID 
                      <input {...register('tenantId')} className="border-b border-orange-400 mx-2 px-1 w-32 focus:border-orange-600 focus:outline-none bg-transparent inline-block placeholder:text-gray-500" placeholder="Tenant ID" />
                      en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal 
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-2 px-1 w-40 focus:border-orange-600 focus:outline-none bg-transparent inline-block">
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      , comunico que estaremos desocupando dicho local aproximadamente el día 
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block text-gray-800" />
                      .
                    </p>
                  </div>
                  
                  {/* Dropdown para motivo de desocupación */}
                  <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">El motivo por el cual desocupo el local es:</label>
                    <select {...register('motivoDesocupacion')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base placeholder:text-gray-500">
                      <option value="" className="text-gray-500">Seleccione el motivo...</option>
                      {MOTIVOS_DESOCUPACION.map(motivo => (
                        <option key={motivo} value={motivo}>{motivo}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown para destino de bienes */}
            <div className="mb-8">
              <label className="block mb-2 font-medium text-gray-700 text-sm">Mis bienes serán destinados de la siguiente manera:</label>
              <select {...register('destinoBienes')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base placeholder:text-gray-500">
                <option value="" className="text-gray-500">Seleccione el destino...</option>
                {DESTINO_BIENES.map(destino => (
                  <option key={destino} value={destino}>{destino}</option>
                ))}
              </select>
            </div>

            {/* Autorización de devolución */}
            <div className="mb-8">
              <p className="mb-4 text-gray-800">
                Asimismo, autorizo a <strong className="text-orange-600">Almacenajes Minidepósitos</strong> a realizar la devolución correspondiente que se tenga a mi favor, <u>en caso de aplicar</u>, mediante transferencia a la cuenta bancaria detallada a continuación:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Nombre de la Cuenta:</label>
                  <input {...register('nombreCuenta')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base placeholder:text-gray-500" placeholder="Nombre completo del titular" />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Banco:</label>
                  <input {...register('banco')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base placeholder:text-gray-500" placeholder="Nombre del banco" />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Tipo de Cuenta:</label>
                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 mt-2">
                    <label className="flex items-center cursor-pointer">
                      <input {...register('tipoCuenta')} type="radio" value="corriente" className="mr-2 w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                      <span className="text-sm sm:text-base text-gray-800">Corriente</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input {...register('tipoCuenta')} type="radio" value="ahorro" className="mr-2 w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                      <span className="text-sm sm:text-base text-gray-800">Ahorro</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">No. De Cuenta:</label>
                  <input {...register('numeroCuenta')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base placeholder:text-gray-500" placeholder="Número de cuenta" />
                </div>
              </div>
            </div>

            {/* Despedida */}
            <div className="mb-8">
              <p className="text-sm sm:text-base text-gray-800">Atentamente,</p>
            </div>

            {/* Firma */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">Nombre:</label>
                <input {...register('nombreFirma')} className="border-b border-orange-400 w-full p-2 focus:border-orange-600 focus:outline-none bg-transparent text-sm sm:text-base placeholder:text-gray-500" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">Firma:</label>
                <SignaturePad onSignatureChange={handleSignatureChange} width={280} height={140} />
              </div>
            </div>

            {/* Botón de envío */}
            <div className="text-center pt-6 sm:pt-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold flex items-center justify-center mx-auto transition-colors shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto max-w-xs"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
