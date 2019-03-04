import { getBucket } from '../src/cloud-bucket';
import { saferRemove, mkdirp } from 'fs-extra-plus';
import { strictEqual, throws, rejects } from 'assert';
import { readFile } from 'fs-extra-plus';
import { basename } from 'path';
import { loadYaml } from '../src/utils';



const testDir = './test-data/cb/'
const localTestFile = testDir + 'test-file.txt';

const remoteFile01 = 'test-file-01.txt';
const remoteFile02 = 'test-dir/test-file-02.txt';
const remoteFile03 = 'test-dir/test-file-03.txt';
const remoteFile04 = 'test-dir/sub-dir/test-file-sub-03.txt';

const testTmpDir = './test-data/cb/~tmp/';

describe('cb', function () {

	it('cb-gcp-basic', async function () {
		this.timeout(5000);
		const cfg = await loadBucketCfg('testGcp');
		await testBasic.call(this, cfg);
	});

	it('cb-aws-basic', async function () {
		this.timeout(5000);
		const cfg = await loadBucketCfg('testAws');
		await testBasic.call(this, cfg);
	});

	it('cb-gcp-download', async function () {
		this.timeout(5000);
		const cfg = await loadBucketCfg('testGcp');
		await testDownload.call(this, cfg);
	});

	it('cb-aws-download', async function () {
		this.timeout(5000);
		const cfg = await loadBucketCfg('testAws');
		await testDownload.call(this, cfg);
	});

	it('cb-gcp-copy', async function () {
		this.timeout(5000);
		const cfg = await loadBucketCfg('testGcp');
		await testCopy.call(this, cfg);
	});

	it('cb-aws-copy', async function () {
		this.timeout(5000);
		const cfg = await loadBucketCfg('testAws');
		await testCopy.call(this, cfg);
	});
});

//#region    ---------- Test Functions ---------- 

async function testBasic(rawCfg: any) {
	const bucket = await getBucket(rawCfg);
	// Clean test space
	await deleteAll(rawCfg);

	// Test the above 
	let files = await bucket.list();
	strictEqual(files.length, 0, 'Post cleanup (should be 0)');

	// Test upload
	await bucket.upload(localTestFile, remoteFile01);
	await bucket.upload(localTestFile, remoteFile02);
	await bucket.upload(localTestFile, remoteFile03);
	await bucket.upload(localTestFile, remoteFile04);

	// Test basic list
	files = await bucket.list();
	strictEqual(files.length, 4, 'All files');

	// Test list with simple prefix
	files = await bucket.list('test-dir/');
	strictEqual(files.length, 3, '"test-dir/" files');

	// Test list with glob
	files = await bucket.list('test-dir/**/*-03.txt');
	strictEqual(files.length, 2, '"test-dir/**/*-03.txt" files');
}

async function testDownload(rawCfg: any) {
	const bucket = await getBucket(rawCfg);

	// Clean test space
	await deleteAll(rawCfg);

	// Clean tmp folder
	await saferRemove(testTmpDir);
	await mkdirp(testTmpDir);

	// upload file
	await bucket.upload(localTestFile, remoteFile01);

	// download file
	const [remoteFile] = await bucket.download(remoteFile01, testTmpDir);

	const str = await readFile(testTmpDir + basename(remoteFile.name), 'UTF8');
	strictEqual(str, 'test file 01');
}

async function testCopy(rawCfg: any) {
	const bucket = await getBucket(rawCfg);

	// Clean test space
	await deleteAll(rawCfg);

	// upload file
	await bucket.upload(localTestFile, remoteFile01);

	// Test Exception: wrong arg, just end with / 
	await rejects(async function () {
		return bucket.copy(remoteFile01, 'test-copy');
	}, /CS ERROR - destDir must end with '\/'/ig);

	// Test Success: copy file
	await bucket.copy(remoteFile01, 'test-copy/');

	// Test basic list
	const files = await bucket.list();
	strictEqual(files.length, 2, 'One file uploaded, one file copied');
}
//#endregion ---------- /Test Functions ---------- 

//#region    ---------- Utils ---------- 
async function deleteAll(rawCfg: any) {
	const bucket = await getBucket(rawCfg);

	const files = await bucket.list();
	console.log('Delete all remote objects')
	for (const f of files) {
		await bucket.delete(f.name);
	}
	console.log('Delete all remote objects - DONE')
}

async function loadBucketCfg(name: string) {
	let vdevBuckets: any = await loadYaml('./test-data/cb/~test-buckets.yaml');
	const confs = vdevBuckets.buckets;
	// add the .name to each bucket info
	for (let name in confs) {
		confs[name].name = name;
	}
	return confs[name];
}



//#endregion ---------- /Utils ---------- 