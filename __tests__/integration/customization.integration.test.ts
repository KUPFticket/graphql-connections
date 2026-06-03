import {ConnectionManager, IFilter} from '../../src';
import knex from 'knex';
import {test as testConfig} from '../../knexfile.sqlite';
import {KnexQueryResult} from '../types';
import {rejectionOf, validateNodesHaveAttributes} from '../utils';

const knexClient = knex(testConfig);

interface ITransformedNode {
    id: string | number;
    color: string;
}

const attributeMap = {
    id: 'id',
    username: 'username',
    firstname: 'firstname',
    age: 'age',
    haircolor: 'haircolor',
    lastname: 'lastname',
    bio: 'bio',
    updatedAt: 'updated_at'
};

describe('Customizing the ConnectionManager', () => {
    describe('Node transformer', () => {
        it('Can transform a node', async () => {
            const transformer = (node: typeof attributeMap) => {
                return {
                    id: node.id,
                    color: 'blue'
                };
            };
            const nodeConnection = new ConnectionManager<ITransformedNode>(
                {first: 300},
                attributeMap,
                {
                    resultOptions: {nodeTransformer: transformer}
                }
            );

            const queryBuilder = knexClient.queryBuilder().from('mock');
            nodeConnection.createQuery(queryBuilder);
            const result = ((await queryBuilder.select()) || []) as KnexQueryResult;
            nodeConnection.addResult(result);
            const pageInfo = nodeConnection.pageInfo;
            const edges = nodeConnection.edges;

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(300);
            expect(validateNodesHaveAttributes(edges, {color: 'blue'})).toBe(true);
        });
    });

    describe('Filter transformer', () => {
        it('Can transform a filter', async () => {
            const TRANSFORM_FIELD = 'haircolor';
            const castUnixToDateTime = (filter: IFilter) => {
                if (filter.field === TRANSFORM_FIELD) {
                    return {
                        ...filter,
                        value: 'gray'
                    };
                }
                return filter;
            };

            const nodeConnection = new ConnectionManager<ITransformedNode>(
                {
                    first: 300,
                    filter: {
                        field: TRANSFORM_FIELD,
                        operator: '=',
                        value: 'gr'
                    }
                },
                attributeMap,
                {
                    builderOptions: {filterTransformer: castUnixToDateTime}
                }
            );

            const queryBuilder = knexClient.queryBuilder().from('mock');
            nodeConnection.createQuery(queryBuilder);
            const result = ((await queryBuilder.select()) || []) as KnexQueryResult;
            nodeConnection.addResult(result);
            const pageInfo = nodeConnection.pageInfo;
            const edges = nodeConnection.edges;

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(100);
            expect(validateNodesHaveAttributes(edges, {haircolor: 'gray'})).toBe(true);
        });
    });

    describe('Order field mapping', function() {
        const attributeMapWithoutId = {
            username: 'username',
            firstname: 'firstname',
            age: 'age',
            haircolor: 'haircolor',
            lastname: 'lastname',
            bio: 'bio'
        };

        const createConnectionWithoutIdMapping = async (inputArgs = {}) => {
            const nodeConnection = new ConnectionManager(inputArgs, attributeMapWithoutId);
            const queryBuilder = knexClient.queryBuilder().from('mock');

            nodeConnection.createQuery(queryBuilder);
            const result = ((await queryBuilder.select()) || []) as KnexQueryResult;
            nodeConnection.addResult(result);

            return nodeConnection.edges;
        };

        it('Can default order by id without id in the provided attributeMap', async () => {
            const edges = await createConnectionWithoutIdMapping({first: 5});

            expect(edges.map(edge => edge.node.id)).toEqual([1, 2, 3, 4, 5]);
        });

        it('Can explicitly order by id without id in the provided attributeMap', async () => {
            const edges = await createConnectionWithoutIdMapping({
                first: 5,
                orderBy: 'id',
                orderDir: 'desc'
            });

            expect(edges.map(edge => edge.node.id)).toEqual([10000, 9999, 9998, 9997, 9996]);
        });

        it('Does not make id filterable without id in the provided attributeMap', async () => {
            const error = await rejectionOf(
                createConnectionWithoutIdMapping({
                    first: 5,
                    filter: {field: 'id', operator: '=', value: '1'}
                })
            );

            expect(error.message).toEqual(
                "Filter field 'id' either does not exist or is not accessible. Check the attribute map"
            );
        });
    });
});
