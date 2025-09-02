import jsPDF from 'jspdf';
import { OutFormData } from '@/types';
import { SUCURSALES } from '@/constants';

export interface PDFGeneratorOptions {
  data: OutFormData;
  signature?: string;
}

export const generateFormPDF = ({ data, signature }: PDFGeneratorOptions): string => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 30;

    // Configuración de fuentes
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');

  // Título
  doc.text('FORMULARIO DE SOLICITUD DE DESOCUPACIÓN', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('ALMACENAJES MINIDEPÓSITOS', pageWidth / 2, yPosition + 10, { align: 'center' });
  
  yPosition += 35;

  // Fecha del documento
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const fechaCompleta = `Panamá, ${data.fechaDocumento} de ${data.mesDocumento} de 20${data.anoDocumento}`;
  doc.text(fechaCompleta, pageWidth - margin, yPosition, { align: 'right' });
  
  yPosition += 20;

  // Destinatario
  doc.setFont('helvetica', 'bold');
  doc.text('Señores', margin, yPosition);
  yPosition += 7;
  doc.text('Almacenajes Minidepósitos', margin, yPosition);
  yPosition += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Estimados Señores:', margin, yPosition);
  yPosition += 20;

  // Sucursal
  const sucursal = SUCURSALES.find(s => s.id === data.sucursal);
  const sucursalNombre = sucursal?.nombre || 'No especificada';

  // Contenido principal según tipo de persona
  doc.setFont('helvetica', 'normal');
  
  if (data.tipoPersona === 'natural') {
    const textoPersonaNatural = `Por este medio, yo, ${data.nombrePersona || '_____________'} con cédula de identidad personal número ${data.cedulaPersona || '_____________'}, quien mantiene alquilado el local ${data.numeroLocal || '_____________'}, Tenant ID ${data.tenantId || '_____________'} en Almacenajes Minidepósitos, sucursal ${sucursalNombre}, comunico que estaremos desocupando dicho local aproximadamente el día ${data.fechaDesocupacion || '_____________'}.`;
    
    const splitText = doc.splitTextToSize(textoPersonaNatural, pageWidth - 2 * margin);
    doc.text(splitText, margin, yPosition);
    yPosition += splitText.length * 7 + 10;
  } else {
    const textoPersonaJuridica = `Por este medio, yo, ${data.nombrePersona || '_____________'} con cédula de identidad personal número ${data.cedulaPersona || '_____________'}, actuando en mi condición de Representante Legal de la Empresa ${data.nombreEmpresa || '_____________'}, con RUC ${data.rucEmpresa || '_____________'}, quien mantiene alquilado el local ${data.numeroLocal || '_____________'}, Tenant ID ${data.tenantId || '_____________'} en Almacenajes Minidepósitos, sucursal ${sucursalNombre}, comunico que estaremos desocupando dicho local aproximadamente el día ${data.fechaDesocupacion || '_____________'}.`;
    
    const splitText = doc.splitTextToSize(textoPersonaJuridica, pageWidth - 2 * margin);
    doc.text(splitText, margin, yPosition);
    yPosition += splitText.length * 7 + 10;
  }

  // Motivo de desocupación
  doc.setFont('helvetica', 'bold');
  doc.text('El motivo por el cual desocupo el local es:', margin, yPosition);
  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(data.motivoDesocupacion || 'No especificado', margin + 5, yPosition);
  yPosition += 20;

  // Destino de bienes
  doc.setFont('helvetica', 'bold');
  doc.text('Mis bienes serán destinados de la siguiente manera:', margin, yPosition);
  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(data.destinoBienes || 'No especificado', margin + 5, yPosition);
  yPosition += 20;

  // Autorización de devolución
  doc.setFont('helvetica', 'normal');
  const textoAutorizacion = 'Asimismo, autorizo a Almacenajes Minidepósitos a realizar la devolución correspondiente que se tenga a mi favor, en caso de aplicar, mediante transferencia a la cuenta bancaria detallada a continuación:';
  const splitAutorizacion = doc.splitTextToSize(textoAutorizacion, pageWidth - 2 * margin);
  doc.text(splitAutorizacion, margin, yPosition);
  yPosition += splitAutorizacion.length * 7 + 15;

  // Verificar si necesitamos una nueva página
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 30;
  }

  // Datos bancarios
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS BANCARIOS PARA DEVOLUCIÓN:', margin, yPosition);
  yPosition += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Titular de la Cuenta: ${data.nombreCuenta || 'No especificado'}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Banco: ${data.banco || 'No especificado'}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Tipo de Cuenta: ${data.tipoCuenta === 'corriente' ? 'Corriente' : 'Ahorro'}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Número de Cuenta: ${data.numeroCuenta || 'No especificado'}`, margin, yPosition);
  yPosition += 20;

  // Despedida
  doc.text('Atentamente,', margin, yPosition);
  yPosition += 30;

  // Firma
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA:', margin, yPosition);
  yPosition += 10;
  
  // Si hay firma digital, incluirla
  if (signature && signature !== '') {
    try {
      const signatureWidth = 60;
      const signatureHeight = 30;
      doc.addImage(signature, 'PNG', margin, yPosition, signatureWidth, signatureHeight);
      yPosition += signatureHeight + 10;
    } catch (error) {
      console.warn('Error al incluir firma en PDF:', error);
      // Si falla la imagen, mostrar línea para firma manual
      doc.line(margin, yPosition + 10, margin + 60, yPosition + 10);
      yPosition += 20;
    }
  } else {
    // Línea para firma manual si no hay firma digital
    doc.line(margin, yPosition + 10, margin + 60, yPosition + 10);
    yPosition += 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${data.nombreFirma || 'No especificado'}`, margin, yPosition);
  yPosition += 10;

  // Fecha de generación del documento
  const fechaGeneracion = new Date().toLocaleString('es-PA');
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Documento generado el: ${fechaGeneracion}`, margin, doc.internal.pageSize.getHeight() - 10);

    // Retornar el PDF como base64
    return doc.output('datauristring');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('PDF generation failed');
  }
};
