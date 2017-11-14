const express = require('express');
// Glue layer between Express & GraphQL
const expressGraphQL = require('express-graphql');
const schema = require('./schema/schema');

const app = express();

app.use(
  '/graphql',
  expressGraphQL({
    schema,
    // Make queries against development server
    graphiql: true
  })
);

app.listen(4000, () => {
  console.log('Listening');
});
