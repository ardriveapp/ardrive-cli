# Network tests

Useful to monitor both inbound and outbound traffic to BATS Docker

Disclaimer: *Might now work on MacOS*

With your ardrive-bats-docker running, in another terminal we run the following command:

```docker run -it --rm --cap-add=NET_ADMIN --net container:ardrive-cli-bats nicolaka/netshoot```

This will open a new container using the public Netshoot image that controls CLI docker network capabilities.

To see a list of every included package as well as some examples please check [Netshoot repo](https://github.com/nicolaka/netshoot#netshoot-a-docker--kubernetes-network-trouble-shooting-swiss-army-container)


## Usage examples
### Redirecting Traffic

To "disable" any host, we just need to redirect its traffic.

```echo "{IP where we want to redirect} {host I want to redirect}" >> /etc/hosts```

A real example would be ```echo "0.0.0.0 http://ardrive.io" >> /etc/hosts``` to redirect all the traffic to an invalid IP (local-host)

In order to mimic/achieve different behaviors, we can use ```iproute2``` 

e.g. to get an "Unreachable" we could run this command inside Netshoot image

```ip route add unreachable <IP we redirected>```

For more examples please check [iproutes2 documentation](https://baturin.org/docs/iproute2/#ip-route-add-blackhole)

### Measure traffic

Inside Netshoot, run ```iftop``` to monitor connections and measure speeds e.g. while uploading/downloading
