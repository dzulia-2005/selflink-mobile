export type BirthDataPayload = {
  date_of_birth: string;
  time_of_birth: string;
  timezone: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export type PlanetPosition = {
  lon: number;
  sign?: string;
  speed?: number;
};

export type HousePosition = {
  cusp_lon: number;
  sign?: string;
};

export type NatalChart = {
  planets: Record<string, PlanetPosition>;
  houses: Record<string, HousePosition>;
  aspects: Array<Record<string, unknown>>;
  calculated_at?: string;
};
