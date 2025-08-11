'use client';

import { useEffect } from 'react';
import { CheckCircle, Home } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function ThanksPage() {
  useEffect(() => {
    // Confetti inicial - explosión central
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#ea580c', '#fb923c', '#fdba74', '#fed7aa']
    });

    // Confetti lateral izquierdo
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#f97316', '#ea580c', '#fb923c']
      });
    }, 500);

    // Confetti lateral derecho
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#f97316', '#ea580c', '#fb923c']
      });
    }, 1000);

    // Confetti final - lluvia dorada
    setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 360,
        startVelocity: 30,
        gravity: 0.5,
        drift: 0,
        ticks: 200,
        colors: ['#fbbf24', '#f59e0b', '#d97706']
      });
    }, 1500);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 border border-orange-200">
          {/* Icono de éxito */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <CheckCircle className="w-24 h-24 text-green-500 animate-pulse" />
              <div className="absolute inset-0 w-24 h-24 bg-green-500 rounded-full opacity-20 animate-ping"></div>
            </div>
          </div>

          {/* Título principal */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            ¡Formulario Enviado Exitosamente!
          </h1>

          {/* Subtítulo */}
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Su solicitud de desocupación ha sido recibida y procesada correctamente. 
            Nuestro equipo revisará la información y se pondrá en contacto con usted pronto.
          </p>

          {/* Información de contacto */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-3">¿Necesita ayuda adicional?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Si tiene alguna pregunta o necesita modificar su solicitud, no dude en contactarnos:
            </p>
            <div className="text-sm text-gray-700">
              <p><strong>Email:</strong> info@almacenajes.net</p>
              <p><strong>Teléfono:</strong> +507 XXX-XXXX</p>
              <p><strong>Horario:</strong> Lunes a Viernes, 8:00 AM - 5:00 PM</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Volver al Inicio
            </Link>
            
            <button
              onClick={() => window.print()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            >
              📄 Imprimir Confirmación
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Almacenajes Minidepósitos - Sistema de Gestión de Solicitudes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
