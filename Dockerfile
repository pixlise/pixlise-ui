FROM nginx:latest
ARG VERSION

<<<<<<< HEAD
# Copy the build output to replace the default nginx contents.
COPY --from=build /build/client/dist/pixlise /usr/share/nginx/html
#COPY --from=build /build/scripts/launcher.sh /
COPY --from=build /build/scripts/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from build /build/scripts/00-jsonlog.conf /etc/nginx/conf.d/00-jsonlog.conf
=======
# Copy the build output to replace the default nginx contents
COPY ./client/dist/pixlise /usr/share/nginx/html
COPY ./scripts/nginx.conf /etc/nginx/conf.d/default.conf
>>>>>>> 40c93768adfc277de47e58034b69dfcf77d26bea

RUN echo {\"version\": \"${VERSION}\"} > /usr/share/nginx/html/version.json
# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
