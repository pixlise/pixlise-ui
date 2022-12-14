FROM ghcr.io/pixlise/build-container:golang-1.18-protoc-3.7.1-protobuf-3.11.4-angular-13.1.2-nodejs-16 as build

ARG VERSION
ARG BUILD_ENV

COPY . /build/

WORKDIR /build/

RUN sh genproto.sh

WORKDIR /build/client

RUN echo ${VERSION}
RUN echo ${BUILD_ENV}
RUN npm i && npm version ${VERSION} && npm run postinstall ${VERSION} && ng build --configuration=${BUILD_ENV}

FROM nginx:latest
ARG VERSION

# Copy the build output to replace the default nginx contents.
COPY --from=build /build/client/dist/pixlise /usr/share/nginx/html
#COPY --from=build /build/scripts/launcher.sh /
COPY --from=build /build/scripts/nginx.conf /etc/nginx/conf.d/default.conf

RUN echo {\"version\": \"${VERSION}\"} > /usr/share/nginx/html/version.json
# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
#ENTRYPOINT ["/launcher.sh"]
