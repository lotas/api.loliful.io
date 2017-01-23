#
# Build with `docker build -t "loliful/node" .
#

FROM node:latest

MAINTAINER Yaraslau Kurmyza yarik@loliful.io

RUN npm set progress=false
RUN echo '{ "allow_root": true }' > /root/.bowerrc
RUN npm install -g gulp bower pm2

# yarn
RUN curl -o- -L https://yarnpkg.com/install.sh | bash
ENV PATH="/root/.yarn/bin:${PATH}"
