import { Sucursal } from '@/types';

export const SUCURSALES: Sucursal[] = [
  { 
    id: 'vista-hermosa', 
    nombre: 'Vista Hermosa', 
    emails: ['vistahermosa@almacenajes.net', 'ventas.vistahermosa@almacenajes.net'] 
  },
  { 
    id: 'rio-abajo', 
    nombre: 'Rio Abajo', 
    emails: ['rioabajo@almacenajes.net', 'ventas.rioabajo@almacenajes.net'] 
  },
  { 
    id: 'costa-del-este', 
    nombre: 'Costa del Este', 
    emails: ['costadeleste@almacenajes.net', 'ventas.costadeleste@almacenajes.net'] 
  },
  { 
    id: 'albrook', 
    nombre: 'Albrook', 
    emails: ['albrook@almacenajes.net', 'ventas.albrook@almacenajes.net'] 
  },
  { 
    id: 'milla-8', 
    nombre: 'Milla 8', 
    emails: ['milla8@almacenajes.net', 'ventas.milla8@almacenajes.net'] 
  },
  { 
    id: 'san-antonio', 
    nombre: 'San Antonio', 
    emails: ['sanantonio@almacenajes.net', 'ventas.sanantonio@almacenajes.net'] 
  },
  { 
    id: 'tumba-muerto', 
    nombre: 'Tumba Muerto', 
    emails: ['albrook@almacenajes.net', 'ventas.tumbamuerto@almacenajes.net'] 
  },
  { 
    id: 'colon', 
    nombre: 'Colon', 
    emails: ['colon@almacenajes.net'] 
  },
  { 
    id: 'hato-montana', 
    nombre: 'Hato Montaña', 
    emails: ['hatomontana@almacenajes.net'] 
  },
  { 
    id: 'gorgona', 
    nombre: 'Gorgona', 
    emails: ['gorgona@almacenajes.net'] 
  },
  { 
    id: 'david', 
    nombre: 'David', 
    emails: ['david@almacenajes.net'] 
  },
];

export const BANCOS_PANAMA = [
  'Banco Nacional de Panamá',
  'Banco General',
  'Banistmo',
  'BAC Credomatic',
  'Banco Azteca',
  'Scotiabank',
  'Multibank',
  'Global Bank',
  'Credicorp Bank',
  'Banco Aliado',
  'Banco Delta',
  'Towerbank',
];

export const MOTIVOS_DESOCUPACION = [
  'Pocas pertenencias para llenar el depósito',
  'Quería reducir gastos',
  'Recibí mi vivienda o local propio',
  'Dificultades con el servicio',
];

export const DESTINO_BIENES = [
  'Las trasladé a mi vivienda, oficina o local propio',
  'Las moví a otro self storage',
  'Las vendí, regalé doné o las eliminé',
];

export const CONSIDERACION_CAMBIO = [
  'Sí, lo consideré',
  'No, no lo consideré',
];

export const CALIFICACION_EXPERIENCIA = [
  'Satisfecho',
  'Insatisfecho',
];
