# Multi-stage build: Node builds the static site, nginx serves it.
# A middle stage compiles the ngx_brotli dynamic modules against the exact
# nginx version in the base image (--with-compat keeps them binary-compatible).

# --- 1. build the site ------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- 2. compile brotli modules for this exact nginx -------------------------
FROM nginx:1.27-alpine AS brotli
RUN apk add --no-cache build-base git cmake pcre2-dev zlib-dev openssl-dev linux-headers
# ngx_brotli links against PRE-BUILT static brotli libs at deps/brotli/out
# (its config has no system-library fallback and does not compile the
# sources itself), so the submodule must be cmake-built first. Static libs
# mean the final image needs no brotli runtime package.
RUN git clone --depth 1 --recurse-submodules --shallow-submodules \
    https://github.com/google/ngx_brotli /usr/src/ngx_brotli \
  && cd /usr/src/ngx_brotli/deps/brotli \
  && mkdir out && cd out \
  && cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF .. \
  && cmake --build . --config Release --target brotlienc \
  && wget -qO- "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" | tar -xz -C /usr/src \
  && cd "/usr/src/nginx-${NGINX_VERSION}" \
  && ./configure --with-compat --add-dynamic-module=/usr/src/ngx_brotli \
  && make modules \
  && mkdir -p /out \
  && cp objs/ngx_http_brotli_filter_module.so objs/ngx_http_brotli_static_module.so /out/

# --- 3. serve ---------------------------------------------------------------
FROM nginx:1.27-alpine
COPY --from=brotli /out/ /etc/nginx/modules/
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/ || exit 1
