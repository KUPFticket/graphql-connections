import type { Knex } from 'knex';
import * as QUERY_BUILDERS from './query_builder/index.js';
import QueryContext from './query_context.js';
import QueryResult from './query_result.js';
import type {
  ICursorObj,
  IInAttributeMap,
  IInputArgs,
  IQueryBuilder,
  IQueryContext,
  IQueryContextOptions,
  IQueryResult,
  IQueryResultOptions,
  QueryBuilderOptions,
} from './types.js';

/**
 * ConnectionManager
 *
 * A convenience class that helps orchestrate creation of the QueryContext, the building of the
 * connection query (QueryBuilder), and usage of the returned query to calculate the page info and
 * edges (QueryResult)
 *
 */

type KnexQueryResult = Array<{ [attributeName: string]: unknown }>;

export interface IConnectionManagerOptions<CursorObj, Node> {
  contextOptions?: IQueryContextOptions<CursorObj>;
  resultOptions?: IQueryResultOptions<CursorObj, Node>;
  builderOptions?: QueryBuilderOptions;
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export default class ConnectionManager<Node = {}> {
  private queryContext: QueryContext;
  private queryBuilderClass?: typeof QUERY_BUILDERS.Knex;
  private queryBuilder?: IQueryBuilder<Knex.QueryBuilder>;
  private queryResult?: IQueryResult<Node>;

  private inAttributeMap: IInAttributeMap;
  private options: IConnectionManagerOptions<ICursorObj<string>, Node>;

  constructor(
    inputArgs: IInputArgs,
    inAttributeMap: IInAttributeMap,
    options?: IConnectionManagerOptions<ICursorObj<string>, Node>,
    queryBuilderClass?: typeof QUERY_BUILDERS.Knex,
  ) {
    this.options = options || {};
    this.inAttributeMap = inAttributeMap;

    // 1. Create QueryContext
    this.queryContext = new QueryContext(
      inputArgs,
      this.options.contextOptions,
    );

    // add queryBuilder if existent.
    if (queryBuilderClass) {
      this.queryBuilderClass = queryBuilderClass;
    }
  }

  public createQuery(queryBuilder: Knex.QueryBuilder) {
    // 2. Create QueryBuilder
    if (!this.queryBuilder) {
      this.initializeQueryBuilder(queryBuilder);
    }

    if (!this.queryBuilder) {
      throw Error('Query builder could not be correctly initialized');
    }

    return this.queryBuilder.createQuery(queryBuilder);
  }

  public addResult(result: KnexQueryResult) {
    // 3. Create QueryResult
    this.queryResult = new QueryResult<KnexQueryResult, IQueryContext, Node>(
      result,
      this.queryContext,
      this.options.resultOptions,
    );

    return this;
  }

  public get pageInfo() {
    if (!this.queryResult) {
      throw Error('Result must be added before page info can be calculated');
    }
    return this.queryResult.pageInfo;
  }

  public get edges() {
    if (!this.queryResult) {
      throw Error('Result must be added before edges can be calculated');
    }
    return this.queryResult.edges;
  }

  private initializeQueryBuilder(queryBuilder: Knex.QueryBuilder) {
    let builder: typeof QUERY_BUILDERS.Knex;

    // 2. Create QueryBuilder
    if (this.queryBuilderClass) {
      builder = this.queryBuilderClass;
    } else {
      const MYSQL_CLIENTS = ['mysql', 'mysql2'];
      const { client: clientName } = queryBuilder.client.config;
      if (
        typeof clientName === 'string' &&
        MYSQL_CLIENTS.includes(clientName)
      ) {
        builder = QUERY_BUILDERS.KnexMySQL;
      } else {
        builder = QUERY_BUILDERS.Knex;
      }
    }

    this.queryBuilder = new builder(
      this.queryContext,
      this.inAttributeMap,
      this.options.builderOptions,
    );
  }
}
