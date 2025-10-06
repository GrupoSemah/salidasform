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

export default function OutForm() {
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
    shouldUnregister: false,
    defaultValues: {
      tipoPersona: 'natural',
      tipoCuenta: 'corriente',
      nombreCuenta: '',
      banco: '',
      numeroCuenta: ''
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
        nombre_empresa: sanitizeInput(data.nombreEmpresa) || 'N/A',
        ruc_empresa: sanitizeInput(data.rucEmpresa) || 'N/A',
        nombre_cuenta: sanitizeInput(data.nombreCuenta) || 'No especificado',
        banco: sanitizeInput(data.banco) || 'No especificado',
        tipo_cuenta: data.tipoCuenta ? (data.tipoCuenta === 'corriente' ? 'Corriente' : 'Ahorro') : 'No especificado',
        numero_cuenta: sanitizeInput(data.numeroCuenta) || 'No especificado',
        nombre_firma: sanitizeInput(data.nombreFirma),
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

      // Email enviado exitosamente - redirigir inmediatamente
      // NO limpiar el formulario aquí para evitar que el usuario vea campos vacíos
      // La limpieza se hará en la página /thanks si el usuario regresa
      
      console.log('Email enviado exitosamente, redirigiendo...');
      
      // Validación de redirect seguro
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

  const sucursalOptions = SUCURSALES.map(s => ({ value: s.id, label: s.nombre }));

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-4 sm:p-6 lg:p-8 border border-gray-200 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
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
                      <input {...register('nombrePersona')} className={`border-b mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500 ${errors.nombrePersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="nombre completo" />
                    </div>
                    {errors.nombrePersona && (
                      <div className="text-red-500 text-xs mt-1 ml-1">
                        {errors.nombrePersona.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">con correo electrónico</span>
                      <input {...register('correoPersona')} type="email" className={`border-b mx-1 px-1 min-w-[150px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500 ${errors.correoPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="correo@ejemplo.com" />
                    </div>
                    {errors.correoPersona && (
                      <div className="text-red-500 text-xs mt-1 ml-1">
                        {errors.correoPersona.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">y cédula de identidad personal número</span>
                      <input {...register('cedulaPersona')} className={`border-b mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500 ${errors.cedulaPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="número de cédula" />
                    </div>
                    {errors.cedulaPersona && (
                      <div className="text-red-500 text-xs mt-1 ml-1">
                        {errors.cedulaPersona.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, quien mantiene alquilado el local</span>
                      <input {...register('numeroLocal')} className={`border-b mx-1 px-1 min-w-[60px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500 ${errors.numeroLocal ? 'border-red-500' : 'border-orange-400'}`} placeholder="número" />
                    </div>
                    {errors.numeroLocal && (
                      <div className="text-red-500 text-xs mt-1 ml-1">
                        {errors.numeroLocal.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, Tenant ID</span>
                      <input {...register('tenantId')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500" placeholder="Tenant ID" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal</span>
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500">
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, comunico que estaremos desocupando dicho local aproximadamente el día</span>
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-1 px-1 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900" />
                      <span className="text-gray-800 font-medium">.</span>
                    </div>
                  </div>

                  {/* Desktop: Párrafo fluido */}
                  <div className="hidden sm:block">
                    <p className="leading-relaxed text-gray-800">
                      Por este medio, yo, 
                      <input {...register('nombrePersona')} className={`border-b mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.nombrePersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="nombre completo" />
                      con correo electrónico 
                      <input {...register('correoPersona')} type="email" className={`border-b mx-2 px-1 w-44 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.correoPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="correo@ejemplo.com" />
                      y cédula de identidad personal número 
                      <input {...register('cedulaPersona')} className={`border-b mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.cedulaPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="número de cédula" />
                      , quien mantiene alquilado el local 
                      <input {...register('numeroLocal')} className={`border-b mx-2 px-1 w-20 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.numeroLocal ? 'border-red-500' : 'border-orange-400'}`} placeholder="número" />
                      , Tenant ID 
                      <input {...register('tenantId')} className={`border-b mx-2 px-1 w-32 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.tenantId ? 'border-red-500' : 'border-orange-400'}`} placeholder="Tenant ID" />
                      en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal 
                      <select {...register('sucursal')} className={`border-b mx-2 px-1 w-40 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block ${errors.sucursal ? 'border-red-500' : 'border-orange-400'}`}>
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      , comunico que estaremos desocupando dicho local aproximadamente el día 
                      <input {...register('fechaDesocupacion')} type="date" className={`border-b mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block ${errors.fechaDesocupacion ? 'border-red-500' : 'border-orange-400'}`} />
                      .
                    </p>
                    
                    {/* Mostrar errores para desktop */}
                    <div className="mt-2 space-y-1">
                      {errors.nombrePersona && (
                        <div className="text-red-500 text-xs">
                          {errors.nombrePersona.message}
                        </div>
                      )}
                      {errors.correoPersona && (
                        <div className="text-red-500 text-xs">
                          {errors.correoPersona.message}
                        </div>
                      )}
                      {errors.cedulaPersona && (
                        <div className="text-red-500 text-xs">
                          {errors.cedulaPersona.message}
                        </div>
                      )}
                      {errors.numeroLocal && (
                        <div className="text-red-500 text-xs">
                          {errors.numeroLocal.message}
                        </div>
                      )}
                      {errors.tenantId && (
                        <div className="text-red-500 text-xs">
                          {errors.tenantId.message}
                        </div>
                      )}
                      {errors.sucursal && (
                        <div className="text-red-500 text-xs">
                          {errors.sucursal.message}
                        </div>
                      )}
                      {errors.fechaDesocupacion && (
                        <div className="text-red-500 text-xs">
                          {errors.fechaDesocupacion.message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dropdown para motivo de desocupación */}
                  <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">El motivo por el cual desocupo el local es:</label>
                    <select {...register('motivoDesocupacion')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base text-gray-900 placeholder:text-gray-500">
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
                      <input {...register('nombrePersona')} className={`border-b mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500 ${errors.nombrePersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="nombre completo" />
                    </div>
                    {errors.nombrePersona && (
                      <div className="text-red-500 text-xs mt-1 ml-1">
                        {errors.nombrePersona.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">con correo electrónico</span>
                      <input {...register('correoPersona')} type="email" className={`border-b mx-1 px-1 min-w-[150px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500 ${errors.correoPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="correo@ejemplo.com" />
                    </div>
                    {errors.correoPersona && (
                      <div className="text-red-500 text-xs mt-1 ml-1">
                        {errors.correoPersona.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">y cédula de identidad personal número</span>
                      <input {...register('cedulaPersona')} className={`border-b mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500 ${errors.cedulaPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="número de cédula" />
                    </div>
                    {errors.cedulaPersona && (
                      <div className="text-red-500 text-xs mt-1 ml-1">
                        {errors.cedulaPersona.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, actuando en mi condición de Representante Legal de la Empresa</span>
                      <input {...register('nombreEmpresa')} className="border-b border-orange-400 mx-1 px-1 min-w-[150px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500" placeholder="nombre de la empresa" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, con RUC</span>
                      <input {...register('rucEmpresa')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500" placeholder="número de RUC" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, quien mantiene alquilado el local</span>
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-1 px-1 min-w-[60px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500" placeholder="número" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, Tenant ID</span>
                      <input {...register('tenantId')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500" placeholder="Tenant ID" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal</span>
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 placeholder:text-gray-500">
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-gray-800 font-medium">, comunico que estaremos desocupando dicho local aproximadamente el día</span>
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-1 px-1 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900" />
                      <span className="text-gray-800 font-medium">.</span>
                    </div>
                  </div>

                  {/* Desktop: Párrafo fluido para Persona Jurídica */}
                  <div className="hidden sm:block">
                    <p className="leading-relaxed text-gray-800">
                      Por este medio, yo, 
                      <input {...register('nombrePersona')} className={`border-b mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.nombrePersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="nombre completo" />
                      con correo electrónico 
                      <input {...register('correoPersona')} type="email" className={`border-b mx-2 px-1 w-44 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.correoPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="correo@ejemplo.com" />
                      y cédula de identidad personal número 
                      <input {...register('cedulaPersona')} className={`border-b mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.cedulaPersona ? 'border-red-500' : 'border-orange-400'}`} placeholder="número de cédula" />
                      , actuando en mi condición de Representante Legal de la Empresa 
                      <input {...register('nombreEmpresa')} className={`border-b mx-2 px-1 w-56 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.nombreEmpresa ? 'border-red-500' : 'border-orange-400'}`} placeholder="nombre de la empresa" />
                      , con RUC 
                      <input {...register('rucEmpresa')} className={`border-b mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.rucEmpresa ? 'border-red-500' : 'border-orange-400'}`} placeholder="número de RUC" />
                      , quien mantiene alquilado el local 
                      <input {...register('numeroLocal')} className={`border-b mx-2 px-1 w-20 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.numeroLocal ? 'border-red-500' : 'border-orange-400'}`} placeholder="número" />
                      , Tenant ID 
                      <input {...register('tenantId')} className={`border-b mx-2 px-1 w-32 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block placeholder:text-gray-500 ${errors.tenantId ? 'border-red-500' : 'border-orange-400'}`} placeholder="Tenant ID" />
                      en <strong className="text-orange-600">Almacenajes Minidepósitos</strong>, sucursal 
                      <select {...register('sucursal')} className={`border-b mx-2 px-1 w-40 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block ${errors.sucursal ? 'border-red-500' : 'border-orange-400'}`}>
                        <option value="" className="text-gray-500">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      , comunico que estaremos desocupando dicho local aproximadamente el día 
                      <input {...register('fechaDesocupacion')} type="date" className={`border-b mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent text-gray-900 inline-block ${errors.fechaDesocupacion ? 'border-red-500' : 'border-orange-400'}`} />
                      .
                    </p>
                    
                    {/* Mostrar errores para desktop - Persona Jurídica */}
                    <div className="mt-2 space-y-1">
                      {errors.nombrePersona && (
                        <div className="text-red-500 text-xs">
                          {errors.nombrePersona.message}
                        </div>
                      )}
                      {errors.correoPersona && (
                        <div className="text-red-500 text-xs">
                          {errors.correoPersona.message}
                        </div>
                      )}
                      {errors.cedulaPersona && (
                        <div className="text-red-500 text-xs">
                          {errors.cedulaPersona.message}
                        </div>
                      )}
                      {errors.nombreEmpresa && (
                        <div className="text-red-500 text-xs">
                          {errors.nombreEmpresa.message}
                        </div>
                      )}
                      {errors.rucEmpresa && (
                        <div className="text-red-500 text-xs">
                          {errors.rucEmpresa.message}
                        </div>
                      )}
                      {errors.numeroLocal && (
                        <div className="text-red-500 text-xs">
                          {errors.numeroLocal.message}
                        </div>
                      )}
                      {errors.tenantId && (
                        <div className="text-red-500 text-xs">
                          {errors.tenantId.message}
                        </div>
                      )}
                      {errors.sucursal && (
                        <div className="text-red-500 text-xs">
                          {errors.sucursal.message}
                        </div>
                      )}
                      {errors.fechaDesocupacion && (
                        <div className="text-red-500 text-xs">
                          {errors.fechaDesocupacion.message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dropdown para motivo de desocupación */}
                  <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">El motivo por el cual desocupo el local es:</label>
                    <select {...register('motivoDesocupacion')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base text-gray-900 placeholder:text-gray-500">
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
              <select {...register('destinoBienes')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base text-gray-900 placeholder:text-gray-500">
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
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Nota:</span> Los siguientes campos son <strong>opcionales</strong>. Solo complete esta información si desea que se realice una devolución mediante transferencia bancaria.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Nombre de la Cuenta: <span className="text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <input {...register('nombreCuenta')} className="border border-gray-300 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base text-gray-900 placeholder:text-gray-500" placeholder="Nombre completo del titular" />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Banco: <span className="text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <input {...register('banco')} className="border border-gray-300 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base text-gray-900 placeholder:text-gray-500" placeholder="Nombre del banco" />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Tipo de Cuenta: <span className="text-gray-500 font-normal">(opcional)</span>
                  </label>
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
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    No. De Cuenta: <span className="text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <input {...register('numeroCuenta')} className="border border-gray-300 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base text-gray-900 placeholder:text-gray-500" placeholder="Número de cuenta" />
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
                <input {...register('nombreFirma')} className="border-b border-orange-400 w-full p-2 focus:border-orange-600 focus:outline-none bg-transparent text-sm sm:text-base text-gray-900 placeholder:text-gray-500" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">Firma:</label>
                <SignaturePad onSignatureChange={handleSignatureChange} width={280} height={140} />
              </div>
            </div>

            {/* Mostrar error si existe */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error al procesar formulario</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
