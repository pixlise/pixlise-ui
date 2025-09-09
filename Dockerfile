FROM nginx:latest
ARG VERSION

# Copy the build output to replace the default nginx contents
COPY ./client/dist/pixlise /usr/share/nginx/html
# For some reason, CHANGELOG.md is sometimes not updated as the container is built. This
# shouldn't happen because we have a package.json script for prebuild (which does run)
# that copies the change log already. Hopefully this will make it so we don't find this
# happening again
COPY ./client/CHANGELOG.md /usr/share/nginx/html/assets/

COPY ./scripts/nginx.conf /etc/nginx/conf.d/default.conf

RUN echo {\"version\": \"${VERSION}\"} > /usr/share/nginx/html/version.json
# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
