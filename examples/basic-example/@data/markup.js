import * as mutations from "./mutation.js";
import * as queries from "./query.js";
import * as validations from "./validation.js";

import Markup from "../../../dist/index.js";

export default new Markup({ mutations, queries, validations });
