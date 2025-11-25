export type BirthDataProfilePayload = {
  source: 'profile';
};

export type BirthDataFormPayload = {
  source: 'form';
  birth_date: string;
  birth_time: string;
  city: string;
  country: string;
  first_name?: string;
  last_name?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type BirthDataPayload = BirthDataProfilePayload | BirthDataFormPayload;

export type PlanetPosition = {
  lon: number;
  sign?: string;
  speed?: number;
};

export type HousePosition = {
  cusp_lon: number;
  sign?: string;
};

export type Aspect = {
  aspect?: string;
  type?: string;
  name?: string;
  planet1?: string;
  planet2?: string;
  p1?: string;
  p2?: string;
  orb?: number;
  orb_deg?: number;
  angle?: number;
  [key: string]: unknown;
};

export type NatalChart = {
  planets: Record<string, PlanetPosition>;
  houses: Record<string, HousePosition>;
  aspects?: Aspect[];
  calculated_at?: string;
};
