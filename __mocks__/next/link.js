const React = require('react')

const Link = ({ children, href, ...props }) => {
  return React.createElement('a', { href, ...props }, children)
}

module.exports = Link
module.exports.default = Link
