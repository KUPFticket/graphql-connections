import type { Knex } from 'knex';
import { coerceStringValue } from '../coerce_string_value.js';
import type QueryContext from '../query_context.js';
import type {
  IFilter,
  IFilterMap,
  IInAttributeMap,
  IInputFilter,
  IKnexQueryBuilderOptions,
  IQueryBuilder,
} from '../types.js';

/**
 * KnexQueryBuilder
 *
 * A QueryBuilder that creates a query from the QueryContext using Knex
 *
 */

const defaultFilterMap = {
  '>': '>',
  '>=': '>=',
  '=': '=',
  '<': '<',
  '<=': '<=',
  '<>': '<>',
};

const defaultFilterTransformer = (filter: IFilter) => filter;

export default class KnexQueryBuilder
  implements IQueryBuilder<Knex.QueryBuilder>
{
  protected queryContext: QueryContext;
  protected attributeMap: IInAttributeMap;
  protected filterMap: IFilterMap;
  protected useSuggestedValueLiteralTransforms: boolean;
  protected filterTransformer: NonNullable<
    IKnexQueryBuilderOptions['filterTransformer']
  >;

  constructor(
    queryContext: QueryContext,
    attributeMap: IInAttributeMap,
    options: IKnexQueryBuilderOptions = {},
  ) {
    this.queryContext = queryContext;
    this.attributeMap = attributeMap;
    /** Default to true */
    this.useSuggestedValueLiteralTransforms = !(
      options.useSuggestedValueLiteralTransforms === false
    );
    this.filterMap = options.filterMap || defaultFilterMap;
    this.filterTransformer =
      options.filterTransformer || defaultFilterTransformer;

    this.addFilterRecursively = this.addFilterRecursively.bind(this);
  }

  public createQuery(queryBuilder: Knex.QueryBuilder) {
    this.applyLimit(queryBuilder);
    this.applyOrder(queryBuilder);
    this.applyOffset(queryBuilder);
    this.applyFilter(queryBuilder);

    return queryBuilder;
  }
  /**
   * Adds the limit to the sql query builder.
   *     Note: The limit added to the query builder is limit + 1
   *     to allow us to see if there would be additional pages
   */
  protected applyLimit(queryBuilder: Knex.QueryBuilder) {
    queryBuilder.limit(this.queryContext.limit + 1); // add one to figure out if there are more results
  }

  /**
   * Adds the order to the sql query builder.
   */
  protected applyOrder(queryBuilder: Knex.QueryBuilder) {
    // map from node attribute names to sql column names
    const orderBy =
      this.attributeMap[this.queryContext.orderBy] || this.queryContext.orderBy;
    const direction = this.queryContext.orderDir;

    queryBuilder.orderBy(orderBy, direction);
  }

  protected applyOffset(queryBuilder: Knex.QueryBuilder) {
    const offset = this.queryContext.offset;
    queryBuilder.offset(offset);
  }

  /**
   * Adds filters to the sql query builder
   */
  protected applyFilter(queryBuilder: Knex.QueryBuilder) {
    queryBuilder.andWhere((k) =>
      this.addFilterRecursively(this.queryContext.filters, k),
    );
  }

  private computeFilterField(field: string) {
    const mappedField = this.attributeMap[field];
    if (mappedField) {
      return mappedField;
    }

    throw new Error(
      `Filter field '${field}' either does not exist or is not accessible. Check the attribute map`,
    );
  }

  private computeFilterOperator(operator: string) {
    const mappedField = this.filterMap[operator.toLowerCase()];
    if (mappedField) {
      return mappedField;
    }

    throw new Error(
      `Filter operator '${operator}' either does not exist or is not accessible. Check the filter map`,
    );
  }

  // [string, string, string | number | null]
  // tslint:disable-next-line: cyclomatic-complexity
  private filterArgs(filter: IFilter) {
    if (this.useSuggestedValueLiteralTransforms) {
      // tslint:disable-next-line: no-shadowed-variable
      const { field, operator, value } = this.filterTransformer({
        ...filter,
        value:
          typeof filter.value === 'string'
            ? coerceStringValue(filter.value)
            : filter.value,
      });

      if (value === null && operator.toLowerCase() === '=') {
        return [
          (builder: Knex) => {
            builder.whereNull(this.computeFilterField(field));
          },
        ];
      }

      if (value === null && operator.toLowerCase() === '<>') {
        return [
          (builder: Knex) => {
            builder.whereNotNull(this.computeFilterField(field));
          },
        ];
      }

      return [
        this.computeFilterField(field),
        this.computeFilterOperator(operator),
        value,
      ];
    }

    const { field, operator, value } = this.filterTransformer(filter);
    return [
      this.computeFilterField(field),
      this.computeFilterOperator(operator),
      value,
    ];
  }

  private addFilterRecursively(
    filter: IInputFilter,
    queryBuilder: Knex.QueryBuilder,
  ) {
    if (isFilter(filter)) {
      queryBuilder.where(
        ...(this.filterArgs(filter) as Parameters<Knex.Where>),
      );
      return queryBuilder;
    }

    // tslint:disable-next-line
    if (filter.and && filter.and.length > 0) {
      filter.and.forEach((f) => {
        if (isFilter(f)) {
          queryBuilder.andWhere(
            ...(this.filterArgs(f) as Parameters<Knex.Where>),
          );
        } else {
          queryBuilder.andWhere((k) => this.addFilterRecursively(f, k));
        }
      });
    }

    if (filter.or && filter.or.length > 0) {
      filter.or.forEach((f) => {
        if (isFilter(f)) {
          queryBuilder.orWhere(
            ...(this.filterArgs(f) as Parameters<Knex.Where>),
          );
        } else {
          queryBuilder.orWhere((k) => this.addFilterRecursively(f, k));
        }
      });
    }

    if (filter.not && filter.not.length > 0) {
      filter.not.forEach((f) => {
        if (isFilter(f)) {
          queryBuilder.andWhereNot(
            ...(this.filterArgs(f) as Parameters<Knex.Where>),
          );
        } else {
          queryBuilder.andWhereNot((k) => this.addFilterRecursively(f, k));
        }
      });
    }

    return queryBuilder;
  }
}

const isFilter = (filter: IInputFilter): filter is IFilter => {
  if (!filter) {
    return false;
  }

  const asIFilter = filter as IFilter;

  return (
    asIFilter.field !== undefined &&
    asIFilter.operator !== undefined &&
    asIFilter.value !== undefined
  );
};
