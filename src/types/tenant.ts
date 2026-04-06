// Types para el sistema de lookup de tenants

export interface TenantInfo {
  tenantId: string;
  locationId: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  license: string | null;
  unitNumber: string | null;
}

export interface TenantUnit {
  locationId: string;
  unitNumber: string;
  unitSize: string | null;
  tenantName: string | null;
  company: string | null;
  email: string | null;
  monthlyRent: number;
  insurance: number;
  depositAmount: number;
  totalMonthlyWithTax: number;
  currentBalance: number;   // Saldo pendiente (overdue balance)
  amountDue: number;        // Saldo final (deposit - monthly - currentBalance, negative = owes)
  paidThru: string | null;
}

export interface TenantUnitsSummary {
  totalUnits: number;
  totalDeposits: number;
  totalMonthlyWithTax: number;
  totalAmountDue: number;
}

export interface TenantLookupResponse {
  success: boolean;
  message: string;
  tenant: TenantInfo | null;
}

export interface TenantUnitsResponse {
  success: boolean;
  tenant: TenantInfo;
  units: TenantUnit[];
  summary: TenantUnitsSummary;
}

// Pre-filled data passed from the multi-step flow to OutForm
export interface PrefilledFormData {
  tenantId: string;
  nombrePersona: string;
  correoPersona: string;
  cedulaPersona: string;
  sucursal: string;        // SUCURSALES id (e.g. 'albrook')
  numeroLocal: string;     // Comma-separated unit numbers (e.g. 'AA40, BB20')
  selectedUnits: TenantUnit[];
}