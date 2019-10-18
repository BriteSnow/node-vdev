import * as handlebars from 'handlebars';
import { userInfo } from 'os';
import { resolve } from 'path';
import { yaml, findVal } from './utils';
import * as fs from 'fs-extra-plus';
import { HelperOptions } from 'handlebars';

export async function render(templateString: string, data: any) {
	const hbs = getHandlebars();
	const tmpl = handlebars.compile(templateString, { noEscape: true });
	const outContent = tmpl(data);
	return outContent;
}

export async function loadTemplatizedYaml(path: string, data?: any) {
	try {
		const stringContent = await fs.readFile(path, 'utf8');
		const content = await render(stringContent, data);
		return yaml(content);
	} catch (ex) {
		console.log(`ERROR - Cannot load ${resolve(path)}\n\tcause ${ex}`);
		throw ex;
	}

}

// --------- Handlebars Factory --------- //
let _handlebars: typeof Handlebars | null = null;
// Initial
function getHandlebars() {
	if (_handlebars) {
		return _handlebars;
	}

	// encode64
	handlebars.registerHelper('encode64', function (this: any, arg1: any, arg2: any) {
		let val: string;
		let opts: any;
		// if we do not have two args, then, it is a regular helper
		if (arg2 === undefined) {
			opts = arg1;
			val = opts.fn(this);
		}
		// if we have two args, then, the first is the value
		else {
			val = arg1 as string;
			opts = arg2;
		}
		const b64 = Buffer.from(val).toString('base64');
		return b64;
	});

	handlebars.registerHelper('username', function () {
		const username = userInfo().username;
		return username;
	});

	// return the absolute dir of the project (where the script is being run) (with an ending '/')
	handlebars.registerHelper('projectDir', function () {
		return resolve('./') + '/';
	});

	handlebars.registerHelper('assign', function (this: any, varName: string, varValue: any, options: HelperOptions) {
		if (!options.data.root) {
			options.data.root = {};
		}
		options.data.root[varName] = varValue;
	});

	handlebars.registerHelper('assignJsonValue', function (this: any, varName: string, jsonFile: any, namePath: any, options: HelperOptions) {
		if (!options.data.root) {
			options.data.root = {};
		}
		// handlebars helper does not support async
		const obj = fs.readJsonSync(jsonFile);
		const val = findVal(obj, namePath);
		options.data.root[varName] = val;
	});



	_handlebars = handlebars;
	return _handlebars;
}
// --------- /Handlebars Factory --------- //


