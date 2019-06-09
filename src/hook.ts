import { RealmType, Realm } from "./realm";
import * as awsHooks from './hook-aws';
import * as gcpHooks from './hook-gcp';


type HookFn = (realm: Realm, ...args: any[]) => Promise<any>;
type HookName = 'dpush_prep' | 'dpush_image_ex' | 'realm_init' | 'realm_set_begin' | 'realm_check';

const hooksDic: Map<RealmType, Map<HookName, HookFn>> = new Map();

type FnByHookName = { [name: string]: HookFn };

//#region    ---------- Initialize the Hook Registry ---------- 
const hookObjByType = {
	'aws': awsHooks as FnByHookName,
	'gcp': gcpHooks as FnByHookName
};

for (const k of Object.keys(hookObjByType)) {
	const type = k as 'aws' | 'gcp'; // Note: might have a better way to get types from hookObjByType
	const fnByName = hookObjByType[type];
	for (const key in fnByName) {
		// TODO: need some validations
		const name = key as HookName;
		const fn = fnByName[name] as HookFn;
		registerHook(type, name, fn);
	}
}

//#endregion ---------- /Initialize the Hook Registry ---------- 

export async function callHook(realm: Realm, name: HookName, ...args: any[]) {
	const fn = getHook(realm.type, name);
	if (fn) {
		return fn(realm, ...args);
	}
}

function getHook(type: RealmType, name: HookName): HookFn | undefined {
	const fnDic = hooksDic.get(type);
	return (fnDic) ? fnDic.get(name) : undefined;
}

function registerHook(type: RealmType, name: HookName, fn: HookFn) {
	let fnDic = hooksDic.get(type);
	if (fnDic == null) {
		fnDic = new Map<HookName, HookFn>();
		hooksDic.set(type, fnDic);
	}
	fnDic.set(name, fn);
}

