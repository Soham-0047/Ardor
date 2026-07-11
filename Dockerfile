# FanForge — single-container image: Express API + built React client on :4000.
#
#   docker build -t fanforge .
#   docker run -p 4000:4000 fanforge                          # in-memory Mongo
#   docker run -p 4000:4000 -e MONGODB_URI=mongodb://... fanforge   # real Mongo
#
# node:20-slim (Debian) rather than alpine: the in-memory MongoDB fallback
# downloads a glibc mongod binary, which needs libcurl + certs.
FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends libcurl4 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install workspaces first for layer caching.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY . .

# Build the client; Express serves client/dist alongside /api.
RUN npm --workspace client run build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["npm", "--workspace", "server", "run", "start"]
