import { DateTime, type DateTimeOptions } from 'luxon';
import type { FilterTransformer, IFilter } from './types.js';

/**
 * Given filter values in unix seconds, this will convert the filters to mysql timestamps
 */
function castUnixSecondsFiltersToMysqlTimestamps<
  T extends Record<string, unknown>,
>(
  filterFieldsToCast: Array<keyof T>,
  timezone: DateTimeOptions['zone'] = 'UTC',
  includeOffset = false,
  includeZone = false,
): FilterTransformer {
  // tslint:disable-next-line: cyclomatic-complexity
  return (filter: IFilter): IFilter => {
    if (
      filterFieldsToCast.includes(filter.field) &&
      filter.value &&
      filter.value !== 'null'
    ) {
      if (!isNumberOrString(filter.value)) {
        throw new Error(`Cannot parse timestamp filter: ${filter.field}`);
      }

      const filterValue =
        typeof filter.value === 'string' ? Number(filter.value) : filter.value;

      return {
        ...filter,
        value: DateTime.fromSeconds(filterValue, { zone: timezone }).toSQL({
          includeOffset,
          includeZone,
        }),
      };
    }
    return filter;
  };
}

function isNumberOrString(
  value: unknown,
): value is string | number {
  return ['number', 'string'].includes(typeof value);
}

/**
 * Run a number of filter transformers from left to right on an IFilter.
 */
function compose(...transformers: FilterTransformer[]): FilterTransformer {
  return (filter: IFilter) =>
    transformers.reduce((accum, transformer) => {
      return transformer(accum);
    }, filter);
}

export default { castUnixSecondsFiltersToMysqlTimestamps, compose };
