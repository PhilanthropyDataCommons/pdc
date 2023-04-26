import { loadTableMetrics } from './loadTableMetrics';
import { loadObjects } from './loadObjects';
import type { TinyPgParams } from 'tinypg';
import type {
  Bundle,
} from '../../types';

export const loadBundle = async <T extends object>(
  tinyPgQueryName: string,
  tinyPgQueryParameters: TinyPgParams,
  tableName: string,
): Promise<Bundle<T>> => {
  const entries = await loadObjects<T>(
    tinyPgQueryName,
    tinyPgQueryParameters,
  );
  const metrics = await loadTableMetrics(tableName);

  return {
    entries,
    total: metrics.count,
  };
};
