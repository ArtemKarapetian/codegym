import { eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { exercises } from '../db/schema';

export interface ExerciseItem {
  number: number;
  name: string;
  description: string | null;
  isOverride: boolean; // true = city-specific, false = base
}

/**
 * Returns the merged 9-exercise list for a city: city overrides on top of
 * base exercises, with placeholders ("Упражнение N") for missing slots.
 */
export function getExercisesForCity(cityId: string | null): ExerciseItem[] {
  const baseRows = db
    .select()
    .from(exercises)
    .where(isNull(exercises.cityId))
    .all();

  const baseMap = new Map<number, (typeof baseRows)[0]>();
  for (const r of baseRows) {
    baseMap.set(r.exerciseNumber, r);
  }

  const overrideMap = new Map<number, (typeof baseRows)[0]>();
  if (cityId) {
    const overrideRows = db
      .select()
      .from(exercises)
      .where(eq(exercises.cityId, cityId))
      .all();
    for (const r of overrideRows) {
      overrideMap.set(r.exerciseNumber, r);
    }
  }

  const result: ExerciseItem[] = [];
  for (let n = 1; n <= 9; n++) {
    const override = overrideMap.get(n);
    const base = baseMap.get(n);
    const row = override || base;
    result.push({
      number: n,
      name: row?.name ?? `Упражнение ${n}`,
      description: row?.description ?? null,
      isOverride: !!override,
    });
  }
  return result;
}
