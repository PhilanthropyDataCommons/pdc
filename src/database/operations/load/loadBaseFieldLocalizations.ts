import { db } from '../../db';
import type { BaseFieldLocalization, JsonResultSet } from '../../../types';

export const loadBaseFieldLocalizations = async (): Promise<
	BaseFieldLocalization[]
> =>
	(
		await db.sql<JsonResultSet<BaseFieldLocalization>>(
			'baseFieldLocalizations.selectAll',
		)
	).rows.map((row) => row.object);
