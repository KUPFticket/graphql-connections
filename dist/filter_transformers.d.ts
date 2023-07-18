import { DateTimeOptions } from 'luxon';
import { FilterTransformer } from './types';
/**
 * Given filter values in unix seconds, this will convert the filters to mysql timestamps
 */
declare function castUnixSecondsFiltersToMysqlTimestamps<T extends Record<string, unknown>>(filterFieldsToCast: Array<keyof T>, timezone?: DateTimeOptions['zone'], includeOffset?: boolean, includeZone?: boolean): FilterTransformer;
/**
 * Run a number of filter transformers from left to right on an IFilter.
 */
declare function compose(...transformers: FilterTransformer[]): FilterTransformer;
declare const _default: {
    castUnixSecondsFiltersToMysqlTimestamps: typeof castUnixSecondsFiltersToMysqlTimestamps;
    compose: typeof compose;
};
export default _default;
