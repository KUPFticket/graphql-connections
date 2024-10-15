import {
  GraphQLError,
  type GraphQLInputObjectType,
  GraphQLScalarType,
  valueFromAST,
} from 'graphql';

import { coerceInputValue } from 'graphql/utilities';

const printInputType = (type: GraphQLInputObjectType) => {
  const fields = type.getFields();
  const fieldNames = Object.keys(fields);
  const typeSig = fieldNames.reduce(
    (acc, name) => {
      acc[name] = fields[name].type.toString();
      return acc;
    },
    {} as {
      [field: string]: string;
    },
  );
  return JSON.stringify(typeSig)
    .replace(/[\\"]/gi, '')
    .replace(/[:]/gi, ': ')
    .replace(/[,]/gi, ', ');
};

const generateInputTypeError = (
  typeName: string,
  inputTypes: GraphQLInputObjectType[],
) => {
  const validTypes = inputTypes
    .map((t) => `${t.name} \`${printInputType(t)}\``)
    .map((t, i) => `${i > 0 ? ' or ' : ''}${t}`);
  return new GraphQLError(
    `${typeName} should be composed of either: ${validTypes}`,
  );
};

export default (
  typeName: string,
  inputTypes: GraphQLInputObjectType[],
  description?: string,
) => {
  return new GraphQLScalarType({
    name: typeName,
    description,
    serialize: (value: unknown) => String(value),
    parseValue: (value: unknown) => {
      const hasType = inputTypes.reduce((acc, t) => {
        try {
          const result = coerceInputValue(value, t) as unknown;
          if (
            typeof result === 'object' &&
            result !== null &&
            'errors' in result
          ) {
            return (result as { errors: unknown[] }).errors.length > 0
              ? acc
              : true;
          }
          return true;
        } catch (error) {
          return acc;
        }
      }, false);

      if (hasType) {
        return value;
      }
      throw generateInputTypeError(typeName, inputTypes);
    },
    parseLiteral: (ast) => {
      const compoundFilterScalarType = inputTypes.find(
        (type) => type.name === 'CompoundFilterScalar',
      );
      const filterScalarType = inputTypes.find(
        (type) => type.name === 'FilterScalar',
      );

      if (!compoundFilterScalarType) {
        throw new Error('Invalid input type provided');
      }

      if (!filterScalarType) {
        throw new Error('Invalid input type provided');
      }

      if (ast.kind !== 'ObjectValue') {
        throw new Error('Invalid AST kind');
      }

      /**
       * Determine if the scalar provided is a compound (or, and)
       * or plain filter scalar (field, operator, value)
       * AND it must only have one of these present in the object root.
       */
      const isCompoundFilterScalar =
        ast.fields.reduce((acc, field) => {
          if (acc) {
            return acc;
          }

          if (['or', 'and', 'not'].includes(field.name.value.toLowerCase())) {
            return true;
          }

          return acc;
        }, false) && ast.fields.length === 1;

      /** Determine if it is a filter scalar. */
      const filterScalarFields = ast.fields
        .map((field) => field.name.value.toLowerCase())
        .reduce(
          (acc, fieldName) => {
            if (fieldName === 'field') {
              acc.hasField = true;
              return acc;
            }

            if (fieldName === 'operator') {
              acc.hasOperator = true;
              return acc;
            }

            if (fieldName === 'value') {
              acc.hasValue = true;
              return acc;
            }

            return acc;
          },
          { hasField: false, hasOperator: false, hasValue: false },
        );

      const isFilterScalar =
        filterScalarFields.hasField &&
        filterScalarFields.hasOperator &&
        filterScalarFields.hasValue;

      if (!isCompoundFilterScalar && !isFilterScalar) {
        throw generateInputTypeError(typeName, inputTypes);
      }

      if (isCompoundFilterScalar) {
        return valueFromAST(ast, compoundFilterScalarType);
      }
      return valueFromAST(ast, filterScalarType);
    },
  });
};
