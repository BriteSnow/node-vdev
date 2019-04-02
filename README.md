## About

**vdev** is a set of utilities for high velocity devops focused on enabling aKubernetes centric development and operation model.

**IMPORTANT** **vdev 0.10.0+** Command command line `./node_modules/.bin/vdev` changed syntax. See below for new commands. 

**NOTE**: At this point this tool is very focused on a specific set of technologies (docker/kubernetes), nodeJs/TypeScript, postgres as db, and google cloud platform). For anybody external to BriteSnow dev (or its clients), it might be considered experimental as API and cli might changes. Feel free to cherry-pick what you might find useful (all MIT license).

**vdev** has two main constructs: 

- **blocks** are module or service (when dockerfile) that get built. vDev recognize if there is a `tsconfig.json`, `package.json`, `Dockerfile` and perform the appropriate built. As of now, vdev does not have a plugin feature, but this will come in the future. Block can also have `webBundles` which can be .js, .ts, .pcss (postcss), or .tmpl (handlebars assume), and vdev will do the appropriate  compile.

- **realms** are kubernetes/cluster contexts where container blocks and yaml resources get deployed to. Realm commands allow to change easily between those k8s contexts and gcp project in one command, and provide simple yet powerfull yaml handlebars templating scheme. Today supports GCP, but the goal is to add AWS soon. 

#### Requirements:

Minimum requirement:
- **node.js > 10**
- **Docker for mac with Kubernetes** support (current edge)
- **Typescript installed globally** (for now) if some typescript blocks
- **docker for 'npm test'**

GCP requirement (for deployment):
- **gcloud** command lines instaleld with the appropriate authentication.

AWS support will be added when it will suport Kubernetes.

## Usage

#### Setup

- In the project, install vdev `npm install vdev`
- In the root project, have a `vdev.yaml` file as below
- Options to run the commands (both option are independent)
  - Option 1 (npm run vdev ...): In `package.json` in the "scripts" object add
    - `"vdev": "./node_modules/.bin/vdev"`
    - Then can use as `npm run vdev dbuild` to docker build the blocks.
  - Option 2 (shell alias): In user `~/.profile` add a line like 
    - `alias vdev="node ./node_modules/.bin/vdev"`
    - Then, from project root, can douse as `vdev dbuild` to docker build the blocks (does not need to have option 1 to work)

#### Commands example

Assuming Option 2 above, and running this command project root. 

```sh
# --- Docker
## Build all block with Dockerfile (or the one marked defaultImages in vdev)
vdev dbuild
## Build a specific list
vdev dbuild web-server,agent

## Push docker image(s) to target registry (all or the defaultImages)
vdev dpush
## Push specific list
vdev dpush web-server,agent

# --- Kubernetes
## Kubectl apply resource files in k8s directory for the current realm (or all specified in defaultConfigurations)
vdev kapply 
## Only some configuration files (with .yaml extension)
vdev kapply _config,web-server,agent

## Kubectl apply (same rule as above)
vdev kcreate web-server,agent

## Kubectl delete (same rule as above)
vdev kdelete 

## Kubectl exec (one service only)
vdev kexec web-server

## Kubectl logs (all pods log)
vdev klogs 
## Only some service log
vdev klogs web-server,agent

## Kubernetes server/service restart. Will call the `/service/restart.sh` of one or more services (not recreating/restart the pod, just call the scripts `/service/restart.sh`)
vdev krestart 

## (internal) just run the templating on a k8s configuration files and output it in the ~out/_realm_/ folder for inspection or manual manipulation
vdev ktemplate

# --- Misc
## Update the app version from multiple file
vdev version
## Remove the package-lock.json and node_modules of all block (not root)
vdev nclean
## Build block (local) with web bundle
vdev build web 
## Build a specific web bundle
vdev build web/css 

# --- Storage
## List 
vdev sls dev:some/prefix
## download
vdev sdown dev:some/file.png
## upload (or can work with file)
vdev sup /some/local/file.png dev:some/folder/
## copy
vdev scp dev:some/file.png prod:other/file.png

```



#### vdev.yaml example

First let's define the `vdev.yaml` at the root of the monorepo. 

```yaml
system: halo
baseBlockDir: services/ # used as the base dir .dir (as '${baseDir}/${blockName}/'')
k8sDir: k8s/ # root 

realms:
  _common:  # common/default values that will be used for each realm
    yamlDir: gke/ # so `k8s/gke` will be the yamlDir if not overriden below.

  dev:
    context: docker-for-desktop
    yamlDir: dev/ # Override the common yaml dir to `k8s/dev/` 
                  #(dev has hooks for debugging and such, and commong yaml files will just add more complexity)

  stage:
    context: gke_my-gcp-project_us-west1-stage-cluster
    project: my-gcp-project

  prod:
    confirmOnDelete: true
    context: gke_my-gcp-prod-project-_us-west1-prod-cluser
    project: my-gcp-prod-project
    loadBalancerIP: '35.33.23.18'

blocks:
  - db
  - queue
  - agent
  - importer
  - name: web
    dir: web/
    baseDistDir: web-server/src/main/webapp
    webBundles:
      - name: lib
        entries: ./src/lib-bundle.js
        dist: ./js/lib-bundle.js
      - name: app
        entries: ./src/**/*.ts
        dist: ./js/app-bundle.js
        rollupOptions:
          globals:
            d3: window.d3
            mvdom: window.mvdom
            handlebars: window.Handlebars        
      - name: css
        entries: ./src/**/*.pcss
        dist: ./css/all-bundle.css
      - name: tmpl
        entries: ./src/**/*.tmpl
        dist: ./js/templates.js
  - name: web-server
    dir: web-server/
    dbuildDependencies: web # build dependency for when running dbuild (no effect on build).
```


## API

### PSQL

```ts
import * as fs from 'fs-extra-plus';
import { assertRealm, getCurrentRealm, psqlImport } from '../main';

const sqlDir = './sql';

/**
 * NOTE assuming recreateDb is called with minimit argv
 * Convention and order of execution is: 
 * 	- sql files starting with '0' will be ran a postgres users
 *  - sql files starting with '1' will be ran a dbPrefix_user on dbPrefix_db
 *  - sql files starting with 'drop-' will be ran a dbPrefix_user on dbPrefix_db
 * @param argv 
 */
async function recreateDb(argv: ParsedArgs) {
	const host = argv._[0] || "localhost";

	const realm = assertRealm(await getCurrentRealm());
	const dbPrefix = realm.system + '_';

	await psqlImport({ user: "postgres", db: "postgres", host: host }, await fs.glob('0*.sql', sqlDir));
	await psqlImport({ user: dbPrefix + "user", db: dbPrefix + "db", host: host }, await fs.glob('1*.sql', sqlDir));
	await psqlImport({ user: dbPrefix + "user", db: dbPrefix + "db", host: host }, await fs.glob('drop-*.sql', sqlDir));
}
```