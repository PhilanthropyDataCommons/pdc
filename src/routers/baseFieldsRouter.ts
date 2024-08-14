import express from 'express';
import { baseFieldsHandlers } from '../handlers/baseFieldsHandlers';
import { requireAdministratorRole } from '../middleware';

const baseFieldsRouter = express.Router();

baseFieldsRouter.get('/', baseFieldsHandlers.getBaseFields);
baseFieldsRouter.post(
	'/',
	requireAdministratorRole,
	baseFieldsHandlers.postBaseField,
);
baseFieldsRouter.put(
	'/:id',
	requireAdministratorRole,
	baseFieldsHandlers.putBaseField,
);
baseFieldsRouter.put(
	'/:id/:language',
	requireAdministratorRole,
	baseFieldsHandlers.putBaseFieldLocalization,
);

export { baseFieldsRouter };
