import { UseFormRegister } from 'react-hook-form';
import { OutFormData } from '@/lib/validations';

// Tipos para sucursales
export interface Sucursal {
  id: string;
  nombre: string;
  emails: string[];
}

// Tipos para opciones de select
export interface Option {
  value: string;
  label: string;
}

// Props para componentes UI
export interface FormFieldProps {
  label: string;
  name: keyof OutFormData;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  register: UseFormRegister<OutFormData>;
  className?: string;
}

export interface SelectFieldProps {
  label: string;
  name: keyof OutFormData;
  options: Option[];
  required?: boolean;
  error?: string;
  register: UseFormRegister<OutFormData>;
  className?: string;
}

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}
