FROM nginx:latest
ARG VERSION

RUN pwd && ls -al / && ls -al /work

# Copy the build output to replace the default nginx contents
COPY /work/client/dist/pixlise /usr/share/nginx/html
COPY /work/scripts/nginx.conf /etc/nginx/conf.d/default.conf

RUN echo {\"version\": \"${VERSION}\"} > /usr/share/nginx/html/version.json
# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
