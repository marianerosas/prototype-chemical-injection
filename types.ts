
export type Role = 'SALES' | 'FIELD_TECH';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
}

export interface Tank {
  id: string;
  name: string;
  siteId: string;
  capacity: number; // liters
  material: string;
  currentVolume: number; // liters
  lastUpdated: string;
  chemicalType: string; // Dynamic product name
}

export interface Pump {
  id: string;
  name: string;
  tankId: string;
  maxRate: number; // Max L/hr
}

export interface Well {
  id: string;
  name: string;
  siteId: string;
  productionRate: number; // barrels per day (bpd)
}

export interface Association {
  id: string;
  wellId: string;
  tankId: string;
  pumpId: string;
  targetPpm: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SimulationData {
  timestamp: string;
  tankVolume: number;
  injectionRate: number; // Liters per hour
}

// For Dashboard Visualization
export interface DashboardMetrics {
  tankId: string;
  wellId: string;
  chemical: string;
  currentRate: number; // L/hr
  estimatedConsumption: number; // L/day
  history: SimulationData[];
}
