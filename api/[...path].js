// Single catch-all Serverless Function for every /api/* endpoint. See
// api/_handlers/router.js for the rationale (Hobby plan 12-function limit) and
// the endpoint table. This file only delegates so the routing stays testable.
import { dispatch } from "./_handlers/router.js";

export default function handler(request, response) {
  return dispatch(request, response);
}
