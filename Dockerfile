FROM node:22-bookworm-slim

WORKDIR /app

# System deps:
# - python3 / make / g++ for native node modules (bcrypt, pg) that invoke node-gyp
# - libvips-dev: required for sharp when built from source (Debian ships libvips 8.14+)
# - libheif-dev: HEIC/HEIF decode support — required by CONTEXT.md format allowlist
# - libde265-dev: HEVC codec library — libheif dynamically loads this; HEIC buffers fail without it
# - ca-certificates: for npm over HTTPS (bookworm-slim does not include by default)
# - procps: provides `ps`, which @nestjs/cli's tree-kill shells out to on
#   `nest start --watch` reloads. Without it, the old node process survives
#   every hot reload and holds port 3004 → EADDRINUSE on the new spawn.
# Cleanup apt lists to keep image under ~200 MB.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 make g++ \
      libvips-dev libvips-tools libheif-dev libde265-dev \
      ca-certificates \
      procps \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Force sharp to rebuild against the system libvips (with libheif linkage).
# sharp's prebuilt binaries do NOT include HEIC — this flag is load-bearing for HEIC support.
# The SHARP_IGNORE_GLOBAL_LIBVIPS=0 env ensures sharp does NOT fall back to its bundled libvips.
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=0
RUN npm ci --build-from-source=sharp || npm ci

COPY . .

EXPOSE 3004

CMD ["npm", "run", "start:dev"]
