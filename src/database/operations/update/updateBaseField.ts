import { db } from '../../db';
import { NotFoundError } from '../../../errors';
import type {
	BaseField,
	JsonResultSet,
	WritableBaseField,
} from '../../../types';

export const updateBaseField = async (
	id: number,
	updateValues: WritableBaseField,
): Promise<BaseField> => {
	const { defaultLabel, defaultDescription, shortCode, dataType, scope } =
		updateValues;
	const result = await db.sql<JsonResultSet<BaseField>>(
		'baseFields.updateById',
		{
			id,
			defaultLabel,
			defaultDescription,
			shortCode,
			dataType,
			scope,
		},
	);
	const baseField = result.rows[0]?.object;
	if (baseField === undefined) {
		throw new NotFoundError('This base field does not exist.');
	}
	return baseField;
};
