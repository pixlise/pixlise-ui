#!/bin/bash
URL=$1
sed -i "s@https://api.pixlise.org@${URL}@g" /usr/share/nginx/html/*.js.map
sed -i "s@https://api.pixlise.org@${URL}@g" /usr/share/nginx/html/*.js
sed -i "s@https://api-dev.pixlise.org@${URL}@g" /usr/share/nginx/html/*.js.map
sed -i "s@https://api-dev.pixlise.org@${URL}@g" /usr/share/nginx/html/*.js
sed -i "s@https://api-staging.pixlise.org@${URL}@g" /usr/share/nginx/html/*.js.map
sed -i "s@https://api-staging.pixlise.org@${URL}@g" /usr/share/nginx/html/*.js
sed -i "s@http://localhost:8080@${URL}@g" /usr/share/nginx/html/*.js.map
sed -i "s@http://localhost:8080@${URL}@g" /usr/share/nginx/html/*.js

nginx -g 'daemon off;'
