/* File contains all the knowledge required for telling GraphQL exactely what your application data looks like:
what properties each object has, & exactely how each object is related to each other */

const axios = require('axios');
const graphql = require('graphql');
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLSchema,
  GraphQLList,
  GraphQLNonNull
} = graphql;

const CompanyType = new GraphQLObjectType({
  name: 'Company',
  /* To solve for the circle reference between "Company" & "User", we add a wrapping arrow function to "fields"
  that now returns an object as a function thanks to closures--gets defined but not executed until after entire file is executed */
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    // Because we have many users associated with a company, we need to wrap UserType as a list
    users: {
      type: new GraphQLList(UserType),
      resolve(parentValue, args) {
        // Use the id of the company to fetch users associated with said company
        return axios
          .get(`http://localhost:3000/companies/${parentValue.id}/users`)
          .then(res => res.data);
      }
    }
  })
});

/* Instruct GraphQL on the idea of a user. It must include the properties of "name" with a capitalized string value
that describes the type, and "fields" object with all the different properties a user has.
Each of these gets a type object to set the type with built-in types.
We use the "resolve" function to make an association/edge with the separate "Company" node. */
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLString },
    firstName: { type: GraphQLString },
    age: { type: GraphQLInt },
    company: {
      type: CompanyType,
      resolve(parentValue, args) {
        return axios
          .get(`http://localhost:3000/companies/${parentValue.companyId}`)
          .then(res => res.data);
      }
    }
  })
});

// The GraphQL query entry points: user, & company.
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    user: {
      type: UserType,
      args: { id: { type: GraphQLString } },
      // Go into data store/DB to find the data queried for, all required arguments passed will be available on "args"
      resolve(parentValue, args) {
        // NOTE: axios nests the async response inside a "data" property, so return first only what's on data
        return axios
          .get(`http://localhost:3000/users/${args.id}`)
          .then(resp => resp.data);
      }
    },
    company: {
      type: CompanyType,
      args: { id: { type: GraphQLString } },
      resolve(parentValue, args) {
        return axios
          .get(`http://localhost:3000/companies/${args.id}`)
          .then(resp => resp.data);
      }
    }
  }
});

/* Define root mutation with fields that do operations to manipulate our collection data,
instead of having logic to edit records inside of the actual type */
const mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    // The field name is a description of the action
    addUser: {
      // Type of data to eventually return from the resolve function
      type: UserType,
      // What to expect to pass to resolve() whenever we make a new user
      args: {
        // What's required is wrapped by GraphQLNonNull()--validation step, providing a company is optional here
        firstName: { type: new GraphQLNonNull(GraphQLString) },
        age: { type: new GraphQLNonNull(GraphQLInt) },
        companyId: { type: GraphQLString }
      },
      // Create new piece of data inside database, destructure off of args.firstName & args.age for 2nd arg
      resolve(parentValue, { firstName, age }) {
        return axios
          .post('http://localhost:3000/users', { firstName, age })
          .then(res => res.data);
      }
    },
    deleteUser: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
      },
      /* GraphQL always expects to get something back, even from delete. Our temporary DB from json-server
      doesn't return anything, so getting "null" back means everything is working. */
      resolve(parentValue, { id }) {
        return axios
          .delete(`http://localhost:3000/users/${id}`)
          .then(res => res.data);
      }
    },
    editUser: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        // What you might want to update, but don't have to
        firstName: { type: GraphQLString },
        age: { type: GraphQLInt },
        companyId: { type: GraphQLString }
      },
      // Send the whole args object
      resolve(parentValue, args) {
        return axios
          .patch(`http://localhost:3000/users/${args.id}`, args)
          .then(res => res.data);
      }
    }
  }
});

// Take a root query & return a GraphQL instance, then export it to be available for elsewhere
module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation
});
