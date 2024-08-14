import { db as defaultDb } from '../../db';
import type {
	BaseField,
	JsonResultSet,
	WritableBaseField,
} from '../../../types';

export const createBaseField = async (
	createValues: WritableBaseField,
	db = defaultDb,
): Promise<BaseField> => {
	const { defaultLabel, defaultDescription, shortCode, dataType, scope } =
		createValues;
	const result = await db.sql<JsonResultSet<BaseField>>(
		'baseFields.insertOne',
		{
			defaultLabel,
			defaultDescription,
			shortCode,
			dataType,
			scope,
		},
	);
	const baseField = result.rows[0]?.object;
	if (baseField === undefined) {
		throw new Error(
			'The base field creation did not appear to fail, but no data was returned by the operation.',
		);
	}
	return baseField;
};
