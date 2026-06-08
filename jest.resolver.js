module.exports = (request, options) => {
  return options.defaultResolver(request.replace(/^node:/, ''), options);
};
