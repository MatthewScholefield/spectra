import type { SeriesConfig, Dataset } from './types';
import { getFullName } from '../utils/format';

export function computeDefaultLabel(
  allSeries: SeriesConfig[],
  series: SeriesConfig,
  datasets: Dataset[],
  displayNames?: Map<string, string>,
): string {
  const datasetIds = new Set(allSeries.map((s) => s.datasetId));
  const columnKeys = new Set(allSeries.map((s) => s.columnKey));

  const ds = datasets.find((d) => d.id === series.datasetId);
  const datasetName = displayNames?.get(series.datasetId)
    ?? ds?.customName
    ?? (ds ? getFullName(ds.origin) : '');
  const columnName = series.columnKey;

  if (columnKeys.size === 1) return datasetName;
  if (datasetIds.size === 1) return columnName;
  return `${datasetName} · ${columnName}`;
}

export function getDisplayLabel(
  allSeries: SeriesConfig[],
  series: SeriesConfig,
  datasets: Dataset[],
  displayNames?: Map<string, string>,
): string {
  return series.customLabel ?? computeDefaultLabel(allSeries, series, datasets, displayNames);
}
