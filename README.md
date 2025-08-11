# 📋 Almacenajes Minidepósitos - Formulario de Desocupación

Sistema web profesional para la gestión de solicitudes de desocupación de locales en Almacenajes Minidepósitos. Desarrollado con Next.js 15, React 19, TypeScript y Tailwind CSS v4.

![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)

## 🚀 Características Principales

- **📱 Diseño Responsivo**: Optimizado para desktop, tablet y móvil
- **✍️ Firma Digital**: Componente de firma integrado con soporte táctil
- **📧 Envío Automático**: Integración con EmailJS para múltiples destinatarios por sucursal
- **🎨 UI Moderna**: Interfaz limpia con paleta de colores naranja corporativa
- **📝 Formularios Dinámicos**: Campos adaptativos para Persona Natural y Jurídica
- **🔒 Validación Robusta**: Validación de formularios con Zod y React Hook Form
- **⚡ Alto Rendimiento**: Construido con las últimas tecnologías web

## 🏗️ Arquitectura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página principal
├── components/            # Componentes React
│   ├── OutForm.tsx        # Componente principal del formulario
│   └── ui/                # Componentes UI reutilizables
│       ├── FormField.tsx  # Campo de formulario genérico
│       ├── Header.tsx     # Encabezado de la aplicación
│       ├── SelectField.tsx # Campo de selección
│       ├── SignaturePad.tsx # Componente de firma digital
│       └── SuccessMessage.tsx # Mensaje de éxito
├── constants/             # Constantes de la aplicación
│   └── index.ts          # Sucursales y configuraciones
├── lib/                   # Utilidades y configuraciones
│   └── validations.ts    # Esquemas de validación Zod
└── types/                 # Definiciones de tipos TypeScript
    └── index.ts          # Tipos principales
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 15.4.6** - Framework React con App Router
- **React 19.1.0** - Biblioteca de interfaz de usuario
- **TypeScript 5.0** - Tipado estático
- **Tailwind CSS v4** - Framework de estilos utilitarios

### Formularios y Validación
- **React Hook Form** - Gestión de formularios performante
- **Zod** - Validación de esquemas TypeScript-first
- **@hookform/resolvers** - Integración Zod con React Hook Form

### Comunicación
- **EmailJS** - Servicio de envío de emails desde el frontend
- **Lucide React** - Iconografía moderna

### Desarrollo
- **ESLint** - Linting de código
- **PostCSS** - Procesamiento de CSS

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd amdoutform
```

### 2. Instalar dependencias
```bash
npm install
# o
yarn install
# o
pnpm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env.local` basado en `env.example`:

```bash
# EmailJS Configuration
NEXT_PUBLIC_EMAILJS_SERVICE_ID=tu_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=tu_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=tu_public_key
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
# o
yarn dev
# o
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📧 Configuración de EmailJS

### 1. Crear cuenta en EmailJS
- Regístrate en [EmailJS](https://www.emailjs.com/)
- Crea un nuevo servicio de email
- Configura tu proveedor de email (Gmail, Outlook, etc.)

### 2. Crear template de email
Utiliza el template HTML proporcionado en la documentación del proyecto que incluye:
- Diseño responsivo y profesional
- Branding de Almacenajes Minidepósitos
- Secciones organizadas por tipo de información
- Variables dinámicas para todos los campos del formulario

### 3. Configurar variables
El template utiliza las siguientes variables:
- `{{emails}}` - Destinatarios
- `{{sucursal_nombre}}` - Sucursal seleccionada
- `{{tipo_persona}}` - Tipo de persona (Natural/Jurídica)
- `{{fecha_documento}}` - Fecha del documento
- `{{nombre_persona}}` - Nombre del solicitante
- Y más... (ver documentación completa)

## 🏢 Sucursales Configuradas

El sistema incluye las siguientes sucursales de Almacenajes Minidepósitos:
- Vista Hermosa
- Rio Abajo
- Costa del Este
- Albrook
- Milla 8
- San Antonio
- Tumba Muerto
- Colon
- Hato Montaña
- Gorgona
- David

Cada sucursal puede tener múltiples emails de destino configurados.

## 📱 Características de UX/UI

### Diseño Responsivo
- **Mobile First**: Optimizado para dispositivos móviles
- **Breakpoints**: Adaptación fluida en todos los tamaños de pantalla
- **Touch Friendly**: Componentes optimizados para interacción táctil

### Firma Digital
- **Canvas HTML5**: Implementación nativa sin dependencias externas
- **Multi-input**: Soporte para mouse y touch
- **Alta resolución**: Escalado automático para pantallas de alta densidad
- **Funcionalidad completa**: Limpiar, redimensionar, validar

### Paleta de Colores
- **Primario**: Naranja (#f97316, #ea580c)
- **Secundario**: Grises neutros
- **Estados**: Colores semánticos para éxito, error, advertencia

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Construcción para producción
npm run start        # Servidor de producción
npm run lint         # Linting de código
```

## 📦 Estructura de Datos

### Formulario Principal
```typescript
interface OutFormData {
  tipoPersona: 'natural' | 'juridica';
  fechaDocumento: string;
  mesDocumento: string;
  anoDocumento: string;
  nombrePersona: string;
  cedulaPersona: string;
  numeroLocal: string;
  sucursal: string;
  fechaDesocupacion: string;
  motivoDesocupacion: string;
  nombreEmpresa?: string;
  rucEmpresa?: string;
  nombreCuenta: string;
  banco: string;
  tipoCuenta: 'corriente' | 'ahorro';
  numeroCuenta: string;
  nombreFirma: string;
  firmaDigital: string;
}
```

### Sucursales
```typescript
interface Sucursal {
  id: string;
  nombre: string;
  emails: string[];
}
```

## 🚀 Despliegue

### Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

### Otras plataformas
El proyecto es compatible con:
- **Netlify**
- **AWS Amplify**
- **Railway**
- **Render**

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es propiedad de **Almacenajes Minidepósitos** y está destinado para uso interno de la empresa.

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema:
- **Email**: soporte@almacenajes.net
- **Teléfono**: +507 XXX-XXXX

---

**Desarrollado con ❤️ para Almacenajes Minidepósitos**
