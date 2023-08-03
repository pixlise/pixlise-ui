FROM nginx:latest
ARG VERSION

# Copy the build output to replace the default nginx contents
COPY ./client/dist/pixlise /usr/share/nginx/html
COPY ./scripts/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./scripts/00-jsonlog.conf /etc/nginx/conf.d/00-jsonlog.conf

RUN echo {\"version\": \"${VERSION}\"} > /usr/share/nginx/html/version.json
# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
