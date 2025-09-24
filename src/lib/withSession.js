import { getIronSession } from 'iron-session';
import { sessionOptions } from './session.js';

export function withSessionRoute(handler) {
  return async function sessionRoute(req, res) {
    req.session = await getIronSession(req, res, sessionOptions);
    return handler(req, res);
  };
}