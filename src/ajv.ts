import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import addFormats from 'ajv-formats';
import * as tags from 'language-tags';

export const ajv = new Ajv({
	coerceTypes: true,
});

ajv.addKeyword({
	keyword: 'isValidLanguage',
	schema: false,
	validate: (data: string) => tags.check(data),
	errors: false,
});

ajvKeywords(ajv, 'instanceof');
addFormats(ajv, ['email', 'uri']);
