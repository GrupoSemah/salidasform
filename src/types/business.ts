// Tipos para entidades del negocio

// Tipo para sucursales de Almacenajes
export interface Sucursal {
  id: string;
  nombre: string;
  emails: string[];
}

// Tipo para opciones de select genéricas
export interface Option {
  value: string;
  label: string;
}

// Configuración de EmailJS
export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}
