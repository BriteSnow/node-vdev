## About

_vdev_ node module is a set of utilities for high velocity development and operation. 

Note that this module is not meant to support any technology, any architecture, but rather very focused set of mature and modern set of technologies that we (i.e. BriteSnow) strong recommend for high velocity development: 

- Java 8 / Guice / Snow on the server side, for highly productive and scalable development platform and runtime. 
- HTML5 / jQuery-Core / Handlebars / PostCSS (or less) / brite.js as DOM Centric MVC approach for the client side. 
- Postgresql as relational datastore.
- BigData store and other store agnostic (no particular utilities for those services)

This module is designed to be used in two different mode: 

- Development, in this case the _vdev_ module will be used in a gulp settings with other build related modules (e.g., PostCSS, Handlebars processors, minimizer/source-map, ...)

- Production, in this case the package.json and ops.js will be used as a custom command line to easily customize some of the QA/Staging/Production script while keeping everything as close as possible to development environment.

*NOTE* This module is still experimental and will go through so changes over the new few months. 

## Install

Note: Not yet as npm module. Will be soon.

Inside your pom.xml directory or in the jettybase parent folder, call the following

```js
npm install npm install git+https://git@github.com/BriteSnow/node-vdev.git --save
```

## Dev Usage

In a dev environment (i.e. in a maven context), the goal is to use gulp for all dev node.js task. 

First, install the following
```
npm install gulp --save
```

_gulpfile.js_
```js
var hbsp = require("hbsp");
var vdev = require("vdev");
var path = require("path");
var concat = require('gulp-concat');
var gulp = require("gulp");


var hbsPrecompile = hbsp.precompile;

var webappDir = "src/main/webapp/";
var sqlDir = "src/main/webapp/WEB-INF/sql/";

gulp.task('default',['hbs']);

// --------- Web Assets Processing --------- //
gulp.task('hbs', function() {
    gulp.src(path.join(webappDir,"/tmpl/",'*.hbs'));
        .pipe(hbsPrecompile())
        .pipe(concat("templates.js"))
        .pipe(gulp.dest(path.join(webappDir,"/js/")));
});
// --------- /Web Assets Processing --------- //

gulp.task('recreateDb', function(){
    vdev.psql("postgres", null, "postgres", vdev.listSqlFiles(sqlDir,{to:0}));      
    vdev.psql(dbPrefix + "_user", null, dbPrefix + "_db", vdev.listSqlFiles(sqlDir,{from:1}));
});

```

Then, in the command line, you can do

```
$ gulp recreateDb
```



## Prod Usage

In a prod setup, we do not really need gulp so we can use a command line approach (see below). 

We are using jetty as our web server, and we usually have the following folder structure: 

```
+ appname_suffix
  + jettybase
    - start.ini (jetty init file, with the port number)
    + webapps
      + appname_war (this is the war folder usually git pull of the target/appname/ folder)
      - appname_war.xml (context xml)
      - appname_war.properties (snow will override the WEB-INF/snow.properties with the properties in this files)
  - jetty.pid (the vdev will keep the pid of the new jetty process created in this file for future shutdown)

```

```_suffix``` can be the ```_qa``` or ```_stage```. 


In the ```appname_suffix``` directory execute this command

```
npm install npm install git+https://git@github.com/BriteSnow/node-vdev.git --save
```

Then, create the following file: 

_ops.js_
```js
var vdev = require("vdev");

var sqlDir = "src/main/webapp/WEB-INF/sql/"; // standard location for a webfile
var dbPrefix = "myapp"; // this will default to myapp_db and myapp_user by convention (see below)
var appName = "myapp"; // this is the war appname prefix that will be used in ops, "jettybase/webapps/myapp_war"

// list of commands
var cmds = {
    
    recreateDb: function(){
        // NOTE: obviously, this works for a QA server that needs to be refreshed, but not in a full production server. In a production setup, we would not have "recreateDb" but perhaps more something like "updateDb"
        vdev.psql("postgres", null, "postgres", vdev.listSqlFiles(sqlDir,{to:0}));      
        vdev.psql(dbPrefix + "_user", null, dbPrefix + "_db", vdev.listSqlFiles(sqlDir,{from:1}));
    },

    start: function(){
        vdev.startJetty("jettybase/"); // not implemented yet
    }, 

    stop: function(){
        vdev.stopJetty("jettybase/"); // not implemented yet
    }

};


// call the right command from the process.argv within this list of cmds functions
vdev.execCmd(cmds);
```


To start execute a command, just do

```
node ops recreateDb
```

The benefit of this approach is that you can simply add more functions as your operation require and bring any other node.js module you might need. The ```vdev``` module is just helping with some of the default operation architecture 




