
### [v0.13.1](https://github.com/BriteSnow/node-vdev/compare/v0.13.0...v0.13.1) 

- `-` watch - fix watch mode for builder rollup/pcss-cli/hbs-ccli

### [v0.13.0](https://github.com/BriteSnow/node-vdev/compare/v0.12.6...v0.13.0) 

- `*+` builder - added builder extensible model. 
- `+` rollup - added builder for rollup when `rollup.config.js` 
- `+` pcss-cli - added builder for pcss-cli when `pcss.config.js` 

### [v0.11.22...v0.12.06](https://github.com/BriteSnow/node-vdev/compare/v0.11.22...v0.12.6) 

- `!` moved to awscli 2 for auto login
- `.` dependencies updates.

### [v0.11.22](https://github.com/BriteSnow/node-vdev/compare/v0.11.3...v0.11.22) June 15th 2020

- Many minor fixes and depedencies update
- `!` sdown - now download to current dir (not to home Download folder an...
- `!` block - make glob entries for rollup and pcss follow order of entries array (critical for accurate pcss compile control flow)
- `!` ! psql - change db cred to follow standard naming, {host, user, database, password}`


### [v0.11.3](https://github.com/BriteSnow/node-vdev/compare/v0.11.1...v0.11.3) Feb 5th 2020

- Fine tune the way `__version__` is handled. and make 'dbuild' block only requirement.

### [v0.11.1](https://github.com/BriteSnow/node-vdev/compare/v0.11.0...v0.11.1) Feb 1st 2020

- Allows `package.json` to have `__version__` which will take precedence over the version property. 

### [v0.11.0](https://github.com/BriteSnow/node-vdev/compare/v0.10.33...v0.11.0) Feb 1st 2020

- (!) Changing way that versioning works (see #2)

