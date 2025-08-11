import { UseFormRegister } from 'react-hook-form';
import { OutFormData } from './form';
import { Option } from './business';

// Props para componentes UI del formulario

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

export interface SignaturePadProps {
  onSignatureChange: (signature: string) => void;
  width?: number;
  height?: number;
}

export interface SuccessMessageProps {
  onNewForm: () => void;
}

export interface HeaderProps {
  title?: string;
  logoSrc?: string;
}
