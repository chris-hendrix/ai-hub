FROM node:alpine

RUN npm install -g @withgraphite/graphite-cli@stable && \
    apk add --no-cache git

CMD ["sh", "-c", "gt auth --token $GRAPHITE_AUTH_TOKEN >/dev/null 2>&1 || true; exec gt mcp"]
