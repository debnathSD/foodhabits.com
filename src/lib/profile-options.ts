/**
 * Profile choices the user can pick. Labels live in the translations under
 * `profileOptions.*`; the engine reads the ids.
 */

export const DIETS = [
  { id: 'any' },
  { id: 'vegetarian' },
  { id: 'eggetarian' },
  { id: 'vegan' },
  { id: 'pescatarian' },
  { id: 'jain' },
] as const;

export const SENSITIVITIES = [
  { id: 'lactose' },
  { id: 'gluten' },
  { id: 'ibs' },
  { id: 'reflux' },
  { id: 'nuts' },
  { id: 'blood-sugar' },
  { id: 'blood-pressure' },
] as const;

export const GOALS = [
  { id: 'digestion' },
  { id: 'bloating' },
  { id: 'energy' },
  { id: 'weight' },
  { id: 'heart' },
] as const;

export type DietId = (typeof DIETS)[number]['id'];
export type SensitivityId = (typeof SENSITIVITIES)[number]['id'];
export type GoalId = (typeof GOALS)[number]['id'];

export type Profile = {
  diet: DietId;
  sensitivities: SensitivityId[];
  goals: GoalId[];
};

export const DEFAULT_PROFILE: Profile = { diet: 'any', sensitivities: [], goals: [] };
