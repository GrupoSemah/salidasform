'use client';

import { AlertTriangle, RefreshCw, Home, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ResendMessagePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    // Simular un pequeño delay antes de redirigir
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 border border-red-200">
          {/* Icono de error */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <AlertTriangle className="w-24 h-24 text-red-500 animate-pulse" />
              <div className="absolute inset-0 w-24 h-24 bg-red-500 rounded-full opacity-20 animate-ping"></div>
            </div>
          </div>

          {/* Título principal */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            ¡Ups! Error al Enviar
          </h1>

          {/* Subtítulo */}
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Lo sentimos, hubo un problema al enviar su formulario. 
            Esto puede deberse a un problema temporal de conexión o del servidor.
          </p>

          {/* Información del error */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-red-800 mb-2">¿Qué pasó?</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• El formulario no pudo ser enviado correctamente</li>
                  <li>• Sus datos no se perdieron, están guardados temporalmente</li>
                  <li>• Puede intentar enviar el formulario nuevamente</li>
                  <li>• Si el problema persiste, contáctenos directamente</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sugerencias para resolver */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-orange-800 mb-3">Posibles soluciones:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-orange-700">
              <div className="text-left">
                <h4 className="font-medium mb-2">Verificar conexión:</h4>
                <ul className="space-y-1">
                  <li>• Revisar conexión a internet</li>
                  <li>• Recargar la página</li>
                  <li>• Intentar desde otro navegador</li>
                </ul>
              </div>
              <div className="text-left">
                <h4 className="font-medium mb-2">Contacto directo:</h4>
                <ul className="space-y-1">
                  <li>• Llamar por teléfono</li>
                  <li>• Enviar email directamente</li>
                  <li>• Visitar la sucursal</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Redirigiendo...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Intentar Nuevamente
                </>
              )}
            </button>
            
            <Link 
              href="/"
              className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Volver al Inicio
            </Link>
          </div>

          {/* Información de contacto directo */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Contacto Directo - Soporte Inmediato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <Phone className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-800 mb-1">Teléfono</h4>
                  <p className="text-sm text-gray-600 mb-1">+507 XXX-XXXX</p>
                  <p className="text-xs text-gray-500">Lun-Vie: 8:00 AM - 5:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Mail className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-800 mb-1">Email</h4>
                  <p className="text-sm text-gray-600 mb-1">soporte@almacenajes.net</p>
                  <p className="text-xs text-gray-500">Respuesta en 24 horas</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>💡 Tip:</strong> Si llama por teléfono, mencione que tuvo problemas con el formulario web 
                para recibir asistencia prioritaria.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Almacenajes Minidepósitos - Sistema de Gestión de Solicitudes
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Error ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} - {new Date().toISOString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
