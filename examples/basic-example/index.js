import { registerMarkup, registerApolloClient } from "../../dist/index.js";

import MarkupConfiguration from "../markup";
import apolloClient from "../apollo/client";
import fetch from "node-fetch";

const GQL_HOST = "http://localhost:3001/lessons/graphql";

registerMarkup(MarkupConfiguration);
registerApolloClient(apolloClient({ fetch, GQL_HOST }));
