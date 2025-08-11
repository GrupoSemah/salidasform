'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { outFormSchema, OutFormData } from '@/lib/validations';
import { SUCURSALES } from '@/constants';
import { User, Building2, Send } from 'lucide-react';
import emailjs from '@emailjs/browser';
import SignaturePad from './ui/SignaturePad';
import SuccessMessage from './ui/SuccessMessage';

export default function OutForm() {
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'juridica'>('natural');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  const onSubmit = async (data: OutFormData) => {
    setIsSubmitting(true);
    
    try {
      const sucursal = SUCURSALES.find(s => s.id === data.sucursal);
      const emailsDestino = sucursal?.emails || ['info@almacenajes.net'];

      const templateParams = {
        emails: emailsDestino.join(','),
        sucursal_nombre: sucursal?.nombre || 'No especificada',
        tipo_persona: data.tipoPersona === 'natural' ? 'Persona Natural' : 'Persona Jurídica',
        fecha_documento: `${data.fechaDocumento}/${data.mesDocumento}/${data.anoDocumento}`,
        nombre_persona: data.nombrePersona,
        cedula_persona: data.cedulaPersona,
        numero_local: data.numeroLocal,
        fecha_desocupacion: data.fechaDesocupacion,
        motivo_desocupacion: data.motivoDesocupacion,
        nombre_empresa: data.nombreEmpresa || 'N/A',
        ruc_empresa: data.rucEmpresa || 'N/A',
        nombre_cuenta: data.nombreCuenta,
        banco: data.banco,
        tipo_cuenta: data.tipoCuenta === 'corriente' ? 'Corriente' : 'Ahorro',
        numero_cuenta: data.numeroCuenta,
        nombre_firma: data.nombreFirma,
        fecha_envio: new Date().toLocaleString('es-PA'),
      };

      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        templateParams,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      );

      setIsSubmitted(true);
      reset();
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      alert('Hubo un error al enviar el formulario. Por favor, inténtelo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTipoPersonaChange = (tipo: 'natural' | 'juridica') => {
    setTipoPersona(tipo);
    setValue('tipoPersona', tipo);
  };

  const handleSignatureChange = (signature: string) => {
    setValue('firmaDigital', signature);
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
            {/* Fecha del documento */}
            <div className="text-right mb-6 text-sm sm:text-base">
              <div className="flex flex-wrap justify-end items-center gap-1">
                <span>Panamá,</span>
                <input {...register('fechaDocumento')} className="border-b border-orange-400 w-12 sm:w-16 text-center focus:border-orange-600 focus:outline-none" placeholder="día" />
                <span>de</span>
                <input {...register('mesDocumento')} className="border-b border-orange-400 w-20 sm:w-24 text-center focus:border-orange-600 focus:outline-none" placeholder="mes" />
                <span>de 20</span>
                <input {...register('anoDocumento')} className="border-b border-orange-400 w-10 sm:w-12 text-center focus:border-orange-600 focus:outline-none" placeholder="año" />
              </div>
            </div>

            {/* Destinatario */}
            <div className="mb-6">
              <p className="font-semibold text-sm sm:text-base">Señores</p>
              <p className="font-semibold text-sm sm:text-base">Almacenajes Minidepósitos</p>
              <p className="mt-4 text-sm sm:text-base">Estimados Señores:</p>
            </div>

            {/* Tipo de Persona */}
            <div className="mb-6 p-4 bg-orange-50 rounded-md border border-orange-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Seleccione el tipo de persona:</p>
              <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-3 sm:space-y-0">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="natural" checked={tipoPersona === 'natural'} onChange={() => handleTipoPersonaChange('natural')} className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                  <User className="w-5 h-5 ml-2 mr-2 text-orange-600" />
                  <span className="text-sm sm:text-base">Persona Natural</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="juridica" checked={tipoPersona === 'juridica'} onChange={() => handleTipoPersonaChange('juridica')} className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                  <Building2 className="w-5 h-5 ml-2 mr-2 text-orange-600" />
                  <span className="text-sm sm:text-base">Persona Jurídica</span>
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
                      <span>Por este medio, yo,</span>
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="nombre completo" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>con cédula de identidad personal número</span>
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="número de cédula" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>, quien mantiene alquilado el local</span>
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-1 px-1 min-w-[60px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="número" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>en <strong>Almacenajes Minidepósitos</strong>, sucursal</span>
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent">
                        <option value="">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>, comunico que estaremos desocupando dicho local aproximadamente el día</span>
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-1 px-1 focus:border-orange-600 focus:outline-none bg-transparent" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>de</span>
                      <input {...register('motivoDesocupacion')} className="border-b border-orange-400 mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="motivo" />
                      <span>. El motivo por el cual desocupo el local es:</span>
                    </div>
                  </div>

                  {/* Desktop: Párrafo fluido */}
                  <div className="hidden sm:block">
                    <p className="leading-relaxed">
                      Por este medio, yo, 
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="nombre completo" />
                      con cédula de identidad personal número 
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="número de cédula" />
                      , quien mantiene alquilado el local 
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-2 px-1 w-20 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="número" />
                      en <strong>Almacenajes Minidepósitos</strong>, sucursal 
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-2 px-1 w-40 focus:border-orange-600 focus:outline-none bg-transparent inline-block">
                        <option value="">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      , comunico que estaremos desocupando dicho local aproximadamente el día 
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block" />
                      de 
                      <input {...register('motivoDesocupacion')} className="border-b border-orange-400 mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="motivo" />
                      . El motivo por el cual desocupo el local es:
                    </p>
                  </div>
                  
                  <textarea className="border border-orange-400 w-full mt-4 p-3 h-20 rounded-md focus:border-orange-600 focus:outline-none resize-none" placeholder="Describa el motivo detalladamente..." />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Layout mobile vs desktop para Persona Jurídica */}
                  <div className="block sm:hidden space-y-3">
                    {/* Mobile: Cada línea separada */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span>Por este medio, yo,</span>
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="nombre completo" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>con cédula de identidad personal número</span>
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="número de cédula" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>, actuando en mi condición de Representante Legal de la Empresa</span>
                      <input {...register('nombreEmpresa')} className="border-b border-orange-400 mx-1 px-1 min-w-[150px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="nombre de la empresa" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>, con RUC</span>
                      <input {...register('rucEmpresa')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="número de RUC" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>, quien mantiene alquilado el local</span>
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-1 px-1 min-w-[60px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="número" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>en <strong>Almacenajes Minidepósitos</strong>, sucursal</span>
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-1 px-1 min-w-[100px] focus:border-orange-600 focus:outline-none bg-transparent">
                        <option value="">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>, comunico que estaremos desocupando dicho local aproximadamente el día</span>
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-1 px-1 focus:border-orange-600 focus:outline-none bg-transparent" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span>de</span>
                      <input {...register('motivoDesocupacion')} className="border-b border-orange-400 mx-1 px-1 min-w-[120px] focus:border-orange-600 focus:outline-none bg-transparent" placeholder="motivo" />
                      <span>. El motivo por el cual desocupo el local es:</span>
                    </div>
                  </div>

                  {/* Desktop: Párrafo fluido para Persona Jurídica */}
                  <div className="hidden sm:block">
                    <p className="leading-relaxed">
                      Por este medio, yo, 
                      <input {...register('nombrePersona')} className="border-b border-orange-400 mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="nombre completo" />
                      con cédula de identidad personal número 
                      <input {...register('cedulaPersona')} className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="número de cédula" />
                      , actuando en mi condición de Representante Legal de la Empresa 
                      <input {...register('nombreEmpresa')} className="border-b border-orange-400 mx-2 px-1 w-56 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="nombre de la empresa" />
                      , con RUC 
                      <input {...register('rucEmpresa')} className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="número de RUC" />
                      , quien mantiene alquilado el local 
                      <input {...register('numeroLocal')} className="border-b border-orange-400 mx-2 px-1 w-20 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="número" />
                      en <strong>Almacenajes Minidepósitos</strong>, sucursal 
                      <select {...register('sucursal')} className="border-b border-orange-400 mx-2 px-1 w-40 focus:border-orange-600 focus:outline-none bg-transparent inline-block">
                        <option value="">Seleccione...</option>
                        {sucursalOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      , comunico que estaremos desocupando dicho local aproximadamente el día 
                      <input {...register('fechaDesocupacion')} type="date" className="border-b border-orange-400 mx-2 px-1 w-36 focus:border-orange-600 focus:outline-none bg-transparent inline-block" />
                      de 
                      <input {...register('motivoDesocupacion')} className="border-b border-orange-400 mx-2 px-1 w-48 focus:border-orange-600 focus:outline-none bg-transparent inline-block" placeholder="motivo" />
                      . El motivo por el cual desocupo el local es:
                    </p>
                  </div>
                  
                  <textarea className="border border-orange-400 w-full mt-4 p-3 h-20 rounded-md focus:border-orange-600 focus:outline-none resize-none" placeholder="Describa el motivo detalladamente..." />
                </div>
              )}
            </div>

            {/* Autorización de devolución */}
            <div className="mb-8">
              <p className="mb-4">
                Asimismo, autorizo a <strong>Almacenajes Minidepósitos</strong> a realizar la devolución correspondiente que se tenga a mi favor, <u>en caso de aplicar</u>, mediante transferencia a la cuenta bancaria detallada a continuación:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Nombre de la Cuenta:</label>
                  <input {...register('nombreCuenta')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base" placeholder="Nombre completo del titular" />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Banco:</label>
                  <input {...register('banco')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base" placeholder="Nombre del banco" />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">Tipo de Cuenta:</label>
                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 mt-2">
                    <label className="flex items-center cursor-pointer">
                      <input {...register('tipoCuenta')} type="radio" value="corriente" className="mr-2 w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                      <span className="text-sm sm:text-base">Corriente</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input {...register('tipoCuenta')} type="radio" value="ahorro" className="mr-2 w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500" />
                      <span className="text-sm sm:text-base">Ahorro</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">No. De Cuenta:</label>
                  <input {...register('numeroCuenta')} className="border border-orange-400 w-full p-2 sm:p-3 rounded-md focus:border-orange-600 focus:outline-none text-sm sm:text-base" placeholder="Número de cuenta" />
                </div>
              </div>
            </div>

            {/* Despedida */}
            <div className="mb-8">
              <p className="text-sm sm:text-base">Atentamente,</p>
            </div>

            {/* Firma */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">Nombre:</label>
                <input {...register('nombreFirma')} className="border-b border-orange-400 w-full p-2 focus:border-orange-600 focus:outline-none bg-transparent text-sm sm:text-base" placeholder="Nombre completo" />
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
