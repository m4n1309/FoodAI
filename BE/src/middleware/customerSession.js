import crypto from 'crypto';

export const requireCustomerSession = (req, res, next) => {
  const sessionId = req.header('X-Customer-Session');
  // không bắt buộc phải có: nếu thiếu thì tạo mới và gắn vào req
  req.customerSessionId = sessionId || crypto.randomUUID();
  req.isNewCustomerSession = !sessionId;
  next();
};