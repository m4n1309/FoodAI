import { v4 as uuidv4 } from 'uuid';

const generateSessionId = () => {
  return uuidv4();
};

const extractSessionIdFromHeader = (req) => {
  const headerSessionId = req.headers['x-session-id'];
  if (headerSessionId) {
    return headerSessionId;
  }

  const cookieSessionId = req.cookies?.sessionId;
  if (cookieSessionId) {
    return cookieSessionId;
  }

  const querySessionId = req.query.sessionId;
  if (querySessionId) {
    return querySessionId;
  }

  return null;
}

const isValidSessionId = (sessionId) => {
  if (!sessionId) {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

const getOrCreateSessionId = (req) => {
  let sessionId = extractSessionIdFromHeader(req);
  if (sessionId && isValidSessionId(sessionId)) {
    return sessionId;
  }
  return generateSessionId();
}

export{
  generateSessionId,
  extractSessionIdFromHeader,
  isValidSessionId,
  getOrCreateSessionId
}