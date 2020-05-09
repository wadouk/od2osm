import envVars from 'preact-cli-plugin-env-vars';

module.exports = function(config, env, helpers) {
  config.devServer.proxy = [
    {
      // proxy requests matching a pattern:
      path: '/api/**',

      // where to proxy to:
      target: process.env.BACKEND,

      // optionally change Origin: and Host: headers to match target:
      // changeOrigin: true,
      // changeHost: true,

      // optionally mutate request before proxying:
      pathRewrite: function(path, request) {
        // you can modify the outbound proxy request here:
        delete request.headers.referer;

        // common: remove first path segment: (/api/**)
        return '/' + path.replace(/^\/[^\/]+\//, '');
      },

      // optionally mutate proxy response:
      // onProxyRes: function(proxyRes, req, res) {
      //   // you can modify the response here:
      //   proxyRes.headers.connection = 'keep-alive';
      //   proxyRes.headers['cache-control'] = 'no-cache';
      // }
    }
  ];
  envVars(config, env, helpers);
};