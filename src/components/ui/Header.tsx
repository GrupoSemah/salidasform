import Image from 'next/image';

export default function Header() {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-4">
        <Image
          src="/logo.png"
          alt="Almacenajes Minidepósitos"
          width={80}
          height={80}
          className="mr-4"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Almacenajes</h1>
          <p className="text-lg text-gray-600">Minidepósitos</p>
        </div>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Solicitud de Depósito</h2>
      <p className="text-gray-600">Los campos con (*) son obligatorios</p>
    </div>
  );
}
