# Codius Host

[Codius](https://codius.org) is an open-source decentralized hosting platform using [Interledger](https://interledger.org). It allows anyone to run software on servers all over the world and pay using any currency. Users package their software inside of [containers](https://www.docker.com/what-container). Multiple containers can run together inside of a [pod](https://kubernetes.io/docs/concepts/workloads/pods/pod/).

**Codiusd** (Codius Daemon; this software) is the server-side component. You can run one or more *codiusd* hosts in your datacenter and Codius clients will pay you to run their software. Codiusd uses [hyperd](https://github.com/hyperhq/hyperd) to provide hardware-level isolation between different pods.

## Prerequisites

* CentOS 7 or higher
* [Node.js](https://nodejs.org) 10 or higher
* A processor with [virtualization support](https://wiki.centos.org/HowTos/KVM#head-6cbcdf8f149ebcf19d53199a30eb053a9fc482db)

## Installation

First, you need to install [hyperd](https://github.com/hyperhq/hyperd). Once hyperd is installed, please make sure it is working correctly:

##### Command line
```sh
sudo hyperctl run -t hello-world
```

##### Expected Output
```
$ sudo hyperctl run -t hello-world
Using default tag: latest
latest: Pulling from library/hello-world
9bb5a5d4561a: Pull complete
Digest: sha256:f5233545e43561214ca4891fd1157e1c3c563316ed8e237750d59bde73361e77
Status: Downloaded newer image for hello-world:latest
sha256:f5233545e43561214ca4891fd1157e1c3c563316ed8e237750d59bde73361e77: Pulling from library/hello-world
Digest: sha256:f5233545e43561214ca4891fd1157e1c3c563316ed8e237750d59bde73361e77
Status: Downloaded newer image for hello-world@sha256:f5233545e43561214ca4891fd1157e1c3c563316ed8e237750d59bde73361e77
Hello from Docker!
This message shows that your installation appears to be working correctly.
To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.
To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash
Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/
For more examples and ideas, visit:
 https://docs.docker.com/engine/userguide/
```

If you don't see the "Hello from Docker!" message, please troubleshoot your hyperd installation before proceeding.

Once hyperd is installed and working, you can install Codius Host.

```sh
sudo npm install -g codiusd
```

##### Open Issues

* [ ] Block network traffic between pods by default
* [ ] Add plugin decorator to Hapi.Request type
* [x] Figure out encoding to hash manifest 
* [ ] How to escape the variable interpolation in manifest parser
* [x] How to fill in the values for private sha256 variables
* [x] Switch hyperctl to hyper.sock http requests
* [ ] Check whether hyper instance is still running before adding duration
* [ ] How do pods spend money?
* [ ] add port field
* [x] add private field to manifest's parent object
* [x] add nonce to the private field spec
* [ ] port blocking on dangerous ports
* [x] change manifest hash encoding to base32
* [ ] publish @sharafian/cog and pull from actual npm
* [ ] proxy endpoints based on manifest hash to the contract's IP
