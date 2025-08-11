import { FormFieldProps } from '@/types';

export default function FormField({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
  error,
  register,
  className = ''
}: FormFieldProps) {
  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        {...register(name)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        placeholder={placeholder}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
