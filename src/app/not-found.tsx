'use client';

import { Home, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 border border-gray-200">
          {/* Número 404 grande */}
          <div className="mb-8">
            <h1 className="text-8xl sm:text-9xl font-bold text-orange-500 mb-4 animate-bounce">
              404
            </h1>
            <div className="w-24 h-1 bg-orange-500 mx-auto rounded-full"></div>
          </div>

          {/* Título y descripción */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
            ¡Oops! Página No Encontrada
          </h2>
          
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Lo sentimos, la página que está buscando no existe o ha sido movida. 
            Puede que haya escrito mal la URL o que el enlace esté desactualizado.
          </p>

          {/* Icono decorativo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Search className="w-16 h-16 text-gray-400" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✕</span>
              </div>
            </div>
          </div>

          {/* Sugerencias */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-orange-800 mb-3">¿Qué puede hacer?</h3>
            <ul className="text-sm text-orange-700 space-y-2 text-left">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                Verificar que la URL esté escrita correctamente
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                Regresar a la página principal del formulario
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                Contactar a soporte si el problema persiste
              </li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Ir al Formulario
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Página Anterior
            </button>
          </div>

          {/* Información de contacto */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              ¿Necesita ayuda? Contáctenos:
            </p>
            <div className="text-sm text-gray-700">
              <p><strong>Email:</strong> soporte@almacenajes.net</p>
              <p><strong>Teléfono:</strong> +507 XXX-XXXX</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Almacenajes Minidepósitos - Sistema de Gestión de Solicitudes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
