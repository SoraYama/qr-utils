import Log4fe from 'log4fe';

export const noop = () => {};

export const logger = new Log4fe({
  autoReport: false,
  autoLogNetwork: false,
  url: 'http://localhost',
}).getLogger('main');
