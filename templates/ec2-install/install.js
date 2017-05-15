const router = require("cmdrouter");
const fs = require("fs-extra-plus");
const spawn = require("p-spawn");

router({all}).route();


async function all(){

	await blockExec("INSTALL GIT", ["sudo yum -y install git"]);

	await blockExec("INSTALL NGINX", ["sudo yum -y install nginx", "sudo yum -y install nginx"]);
	
	await blockExec("INSTALL POSTGRES", ["sudo yum -y localinstall https://download.postgresql.org/pub/repos/yum/9.6/redhat/rhel-6.9-x86_64/pgdg-ami201503-96-9.6-2.noarch.rpm", 
		"sudo yum -y install postgresql96 postgresql96-server postgresql96-devel postgresql96-contrib"]);

	await blockExec("INIT & START POSTGRES", ["sudo service postgresql-9.6 initdb",
		"sudo service  postgresql-9.6 start",
		"sudo chkconfig postgresql-9.6 on"]);

	await blockExec("DOWNLOAD JAVA", [["wget", "--no-check-certificate", "-c", "--header", '"Cookie: oraclelicense=accept-securebackup-cookie"', 
		"http://download.oracle.com/otn-pub/java/jdk/8u131-b11/d54c1d3a095b4ff2b6607d096fa80163/jdk-8u131-linux-x64.rpm"]],{shell: true});

	var javaVersion = "131";

	await blockExec("INSTALL JAVA",[
		`sudo rpm -Uvh jdk-8u${javaVersion}-linux-x64.rpm`,
		`sudo /usr/sbin/alternatives --install /usr/bin/java java /usr/java/jdk1.8.0_${javaVersion}/bin/java 20000`,
		`sudo /usr/sbin/alternatives --set java /usr/java/jdk1.8.0_${javaVersion}/bin/java`], {ignoreFail: true});

	await addToFile("ADD JAVA ENV TO .bash_profile", "/home/ec2-user/.bash_profile",
		["export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8",
			`export JAVA_HOME=/usr/java/jdk1.8.0_${javaVersion}/`]);

	var jettyVersion = "9.4.5.v20170502";
	var jettyName = `jetty-distribution-${jettyVersion}`;

	await blockExec("CLEAN EVENTUAL JETTY", ["rm " + jettyName + ".zip",
		"rm jetty-latest",
		"rm -Rf /home/ec2-user/" + jettyName], {cwd: "/home/ec2-user/", ignoreFail: true});

	await blockExec("DOWNLOAD AND UNZIP JETTY", [`wget "http://repo1.maven.org/maven2/org/eclipse/jetty/jetty-distribution/${jettyVersion}/${jettyName}.zip"`,
		"unzip -q " + jettyName + ".zip",
		"ln -s " + jettyName + " jetty-latest"], {cwd: "/home/ec2-user/", shell: true});

	await addToFile("ADD JETTY TO .bash_profile", "/home/ec2-user/.bash_profile",["export JETTY_HOME=/home/ec2-user/jetty-latest/"]);

	await blockExec("INSTALL MAVEN", ["sudo yum install -y apache-maven"]);

}

async function blockExec(name, cmds, opts){
	console.log(`\n\n====== ${name} ======`);
	for (let cmd of cmds){
		// we make sure the cmd is split by argument (the cmd could be already an array)
		let cmd_a = (cmd instanceof Array)?cmd:cmd.split(" ");
		// first item is the command, the rest are the arguments
		await spawn(cmd_a[0], cmd_a.slice(1),opts);
	}
	console.log(`\n====== /${name} ======`);
}


// --------- File --------- //
async function addToFile(name, filePath, lines){
	console.log(`\n\n====== ${name} ======`);
	console.log("addToFile: " + filePath);
	var content = await fs.readFile(filePath, "utf8");

	var linesToAdd = [];
	for (var line of lines){
		// add only if not already present
		if (content.indexOf(line) === -1){
			console.log("adding line: " + line);
			linesToAdd.push(line);
		}
	}

	if (linesToAdd.length > 0){
		content += "\n";
		content += linesToAdd.join("\n");
		content += "\n";
		console.log(`File updated`);
		await fs.writeFile(filePath, content, "utf8");
	}else{
		console.log(`File already up to date`);
	}
	

	//console.log(`Content:\n${content}`);
	console.log(`\n====== /${name} ======`);
	
}
// --------- /File --------- //
