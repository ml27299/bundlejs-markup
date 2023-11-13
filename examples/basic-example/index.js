import { registerMarkup, registerApolloClient } from "../../dist/index.js";
import MarkupConfiguration from "../markup";
import apolloClient from "../apollo/client";
import fetch from "node-fetch";

const GQL_HOST = "http://localhost:4000/graphql";

registerMarkup(MarkupConfiguration);
registerApolloClient(apolloClient({ fetch, GQL_HOST }));
