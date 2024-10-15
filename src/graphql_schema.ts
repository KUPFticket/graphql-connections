import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLScalarType,
  GraphQLString,
  Kind,
} from 'graphql';

import InputUnionType from './input_union_type.js';

/** @see https://stackoverflow.com/a/49911974 */
const FilterValue = new GraphQLScalarType({
  name: 'FilterValue',
  serialize: (value) => value,
  /**
   * `parseValue` controls what is seen by the resolver.
   */
  parseValue: (value) => value,
  /**
   * `parseLiteral` inputs the AST and returns the parsed value of the type.
   */
  parseLiteral(ast) {
    if (ast.kind === Kind.NULL) {
      return null;
    }

    if (
      ast.kind === Kind.INT ||
      ast.kind === Kind.FLOAT ||
      ast.kind === Kind.BOOLEAN ||
      ast.kind === Kind.STRING
    ) {
      return ast.value;
    }

    throw new Error(
      'An invalid type was given for filter value. Must be either Int, Float, Boolean, Null, or String.',
    );
  },
});

const compoundFilterScalar = new GraphQLInputObjectType({
  name: 'CompoundFilterScalar',
  fields() {
    return {
      and: {
        type: new GraphQLList(filter),
      },
      or: {
        type: new GraphQLList(filter),
      },
      not: {
        type: new GraphQLList(filter),
      },
    };
  },
});

const filterScalar = new GraphQLInputObjectType({
  name: 'FilterScalar',
  fields() {
    return {
      field: {
        type: GraphQLString,
      },
      operator: {
        type: GraphQLString,
      },
      value: {
        type: FilterValue,
      },
    };
  },
});

const filterDescription = `
    The filter input scalar is a
    union of the
    IFilter and ICompundFIlter.
    It allows for recursive
    nesting of filters using
    'and', 'or', and 'not' as
    composition operators

    It's typescript signature is:

    type IInputFilter =
        IFilter | ICompoundFilter;

    interface IFilter {
        value: string;
        operator: string;
        field: string;
    }

    interface ICompoundFilter {
        and?: IInputFilter[];
        or?: IInputFilter[];
        not?: IInputFilter[];
    }
`;

const filter = InputUnionType(
  'Filter',
  [compoundFilterScalar, filterScalar],
  filterDescription,
);

const typeDefs = `
    scalar Filter
    scalar Search
    scalar OrderBy
    scalar OrderDir
    scalar First
    scalar Last
    scalar Before
    scalar After

    interface IConnection {
        pageInfo: PageInfo!
    }

    interface IEdge {
        cursor: String!
    }

    type PageInfo {
        hasPreviousPage: Boolean!
        hasNextPage: Boolean!
        startCursor: String!
        endCursor: String!
    }
`;

const createStringScalarType = (name: string, description: string) =>
  new GraphQLScalarType({
    name,
    description: `String \n\n\ ${description}`,
    serialize: GraphQLString.serialize,
    parseLiteral: GraphQLString.parseLiteral,
    parseValue: GraphQLString.parseValue,
  });

const createIntScalarType = (name: string, description: string) =>
  new GraphQLScalarType({
    name,
    description: `Int \n\n ${description}`,
    serialize: GraphQLInt.serialize,
    parseLiteral: GraphQLInt.parseLiteral,
    parseValue: GraphQLInt.parseValue,
  });

const orderBy = createStringScalarType(
  'OrderBy',
  `
    Ordering of the results.
    Should be a field on the Nodes in the connection
    `,
);

const orderDir = createStringScalarType(
  'OrderDir',
  `
    Direction order the results by.
    Should be 'asc' or 'desc'
    `,
);

const before = createStringScalarType(
  'Before',
  `
    Previous cursor.
    Returns edges after this cursor
    `,
);

const after = createStringScalarType(
  'After',
  `
    Following cursor.
    Returns edges before this cursor
    `,
);

const search = createStringScalarType(
  'Search',
  `
    A search string.
    To be used with full text search index
    `,
);

const first = createIntScalarType(
  'First',
  `
    Number of edges to return at most. For use with 'before'
    `,
);

const last = createIntScalarType(
  'Last',
  `
    Number of edges to return at most. For use with 'after'
    `,
);

const resolvers = {
  Filter: filter,
  Search: search,
  OrderBy: orderBy,
  OrderDir: orderDir,
  First: first,
  Last: last,
  Before: before,
  After: after,
  IConnection: {
    __resolveType() {
      return null;
    },
  },
  IEdge: {
    __resolveType() {
      return null;
    },
  },
};

const gqlTypes = {
  filter,
  search,
  orderBy,
  orderDir,
  first,
  last,
  before,
  after,
};

export { typeDefs, resolvers, gqlTypes };
