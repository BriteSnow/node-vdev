## About

**vdev** is a set of utilities for high velocity devops, specifically focused on docker, kubernetes, postgres, node.js/java, typescript/rollup/postcss for front-ends development. 

**IMPORTANT** **vdev 0.6+** has been complely refactored to support docker, kubernetes, node.js/java, typescript/rollup/postcss for front-end devops/repl development


**NOTE**: At this point this tool is very focused on a specific set of technologies (docker/kubernetes), java/maven, node.js, postgres as db, and google cloud platform). For anybody external to BriteSnow dev (or its client), it might be considered experimental as API and cli might changes. 

**vdev** has to main constructs: 

- **bocks** are module or service (when dockerfile) that get built. vDev recognize if there is a `tsconfig.json`, `package.json`, `pom.xml`, or `Dockerfile` and perform the appropriate built. As of now, vdev does not have a plugin feature, but this will come in the future. Block can also have `webBundles` which can be .js, .ts, .pcss (postcss), or .tmpl (handlebars assume), and vdev will do the appropriate  compile.

- **realms** are kubernetes/cluster contexts where container blocks and yaml resources get deployed to. Realm commands allow to change easily between those k8s contexts and gcp project in one command, and provide simple yet powerfull yaml handlebars templating scheme.

#### Requirements:

Minimum requirement:
- **node.js > 8**
- **Docker for mac with Kubernetes** support (current edge)
- **Java and Maven** for java blocks
- **Typescript installed globally** (for now) if some typescript blocks
- **docker for 'npm test'**

GCP requirement (for deployment):
- **gcloud** command lines instaleld with the appropriate authentication.

AWS support will be added when it will suport Kubernetes (i.e., When EKS will be GA)

## Quick start

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


... more coming later ...