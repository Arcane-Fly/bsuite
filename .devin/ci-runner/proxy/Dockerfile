FROM ubuntu/squid@sha256:94f844158e12b52f51b4ae996515e37e8fb3e8d85e1c86caba1a297376e4ec4f
USER root
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
USER proxy
ENTRYPOINT ["/usr/sbin/squid"]
CMD ["-N", "-f", "/etc/squid/ci-egress.conf"]
