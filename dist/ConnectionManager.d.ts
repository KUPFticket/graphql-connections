import { QueryBuilder as Knex } from 'knex';
import { ICursorObj, IInAttributeMap, IInputArgs, QueryBuilderOptions, IQueryResultOptions, IQueryContextOptions } from './types';
/**
 * ConnectionManager
 *
 * A convenience class that helps orchestrate creation of the QueryContext, the building of the
 * connection query (QueryBuilder), and usage of the returned query to calculate the page info and
 * edges (QueryResult)
 *
 */
declare type KnexQueryResult = Array<{
    [attributeName: string]: any;
}>;
interface IConnectionManagerOptions<CursorObj, Node> {
    contextOptions?: IQueryContextOptions<CursorObj>;
    resultOptions?: IQueryResultOptions<CursorObj, Node>;
    builderOptions?: QueryBuilderOptions;
}
export default class ConnectionManager<Node = {}> {
    private queryContext;
    private queryBuilder?;
    private queryResult?;
    private inAttributeMap;
    private options;
    constructor(inputArgs: IInputArgs, inAttributeMap: IInAttributeMap, options?: IConnectionManagerOptions<ICursorObj<string>, Node>);
    createQuery(queryBuilder: Knex): Knex;
    addResult(result: KnexQueryResult): this;
    readonly pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string;
        endCursor: string;
    };
    readonly edges: {
        cursor: string;
        node: Node;
    }[];
    private initializeQueryBuilder;
}
export {};
