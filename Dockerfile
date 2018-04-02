FROM node:carbon-alpine

# Set working directory
WORKDIR /bacstack

# Install dependencies
COPY package.json .
RUN npm install

# Add node-bacstack
Add . .

# Run compliance tests
CMD npm run compliance
