import { CheckCircle } from 'lucide-react';

interface SuccessMessageProps {
  onNewForm: () => void;
}

export default function SuccessMessage({ onNewForm }: SuccessMessageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Formulario Enviado!</h2>
        <p className="text-gray-600 mb-6">
          Su solicitud ha sido enviada exitosamente. Nos pondremos en contacto con usted pronto.
        </p>
        <button
          onClick={onNewForm}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Enviar Otra Solicitud
        </button>
      </div>
    </div>
  );
}
