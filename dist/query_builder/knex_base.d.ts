import QueryContext from '../query_context';
import { Knex } from 'knex';
import { IFilterMap, IInAttributeMap, IQueryBuilder, IKnexQueryBuilderOptions } from '../types';
export default class KnexQueryBuilder implements IQueryBuilder<Knex.QueryBuilder> {
    protected queryContext: QueryContext;
    protected attributeMap: IInAttributeMap;
    protected filterMap: IFilterMap;
    protected useSuggestedValueLiteralTransforms: boolean;
    protected filterTransformer: NonNullable<IKnexQueryBuilderOptions['filterTransformer']>;
    constructor(queryContext: QueryContext, attributeMap: IInAttributeMap, options?: IKnexQueryBuilderOptions);
    createQuery(queryBuilder: Knex.QueryBuilder): Knex.QueryBuilder<any, any>;
    /**
     * Adds the limit to the sql query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    protected applyLimit(queryBuilder: Knex.QueryBuilder): void;
    /**
     * Adds the order to the sql query builder.
     */
    protected applyOrder(queryBuilder: Knex.QueryBuilder): void;
    protected applyOffset(queryBuilder: Knex.QueryBuilder): void;
    /**
     * Adds filters to the sql query builder
     */
    protected applyFilter(queryBuilder: Knex.QueryBuilder): void;
    private computeFilterField;
    private computeFilterOperator;
    private filterArgs;
    private addFilterRecursively;
}
