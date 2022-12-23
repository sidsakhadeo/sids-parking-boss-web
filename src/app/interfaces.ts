export interface AccountConfig {
  location: string;
  policy: string;
  tenant: string;
  token: string;
  space: string;
  duration: string;
  email: string;
  tel: string;
}

export interface VehicleMap {
  [key: string]: {
    vehicle: string;
    notes: string;
    name: string;
    displayValue: string;
  };
}

export interface ConfigsResponse {
  account: AccountConfig;
  vehicleMap: VehicleMap;
}

export interface Reservation {
  name: string;
  display: string;
  id: string;
  key: string; // license plate
  grace: {
    min: {
      local: string;
    };
    max: {
      local: string;
    };
  };
  valid: {
    min: {
      local: string;
    };
    max: {
      local: string;
    };
  };
}

export interface Usage {
  weeklyLimit: string | undefined;
  monthlyLimit: string | undefined;
  weeklyUsage: string | undefined;
  monthlyUsage: string | undefined;
}
