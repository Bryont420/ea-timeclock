const path = require('path');
const webpack = require('webpack');
const packageJson = require('./package.json');

// Only import BundleAnalyzerPlugin when needed
let BundleAnalyzerPlugin;
if (process.env.ANALYZE) {
  BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
}

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizations
      if (env === 'production') {
        // Enable aggressive tree shaking
        webpackConfig.optimization.sideEffects = true;
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.providedExports = true;

        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 120000,
          minChunks: 1,
          maxAsyncRequests: 15,
          maxInitialRequests: 6,
          automaticNameDelimiter: '-',
          cacheGroups: {
            muiCore: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Box|Typography|Container|CssBaseline|CircularProgress)[\\/]/,
              name: 'mui-core',
              chunks: 'initial',
              priority: 60,
              enforce: true,
            },
            muiIcons: {
              test: /[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/,
              name: 'mui-icons',
              chunks: 'async',
              priority: 55,
              enforce: true,
            },
            muiForm: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](TextField|Select|MenuItem|FormControl|InputLabel|FormControlLabel|Checkbox)[\\/]/,
              name: 'mui-form',
              chunks: 'async',
              priority: 50,
              enforce: true,
              reuseExistingChunk: true,
            },
            muiInputs: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Select|FilledInput|OutlinedInput|Input|InputBase)[\\/]/,
              name: 'mui-inputs',
              chunks: 'async',
              priority: 48,
              enforce: true,
              reuseExistingChunk: true,
            },
            muiLayout: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Card|Grid|Paper|AppBar|Toolbar|Divider)[\\/]/,
              name: 'mui-layout',
              chunks: 'async',
              priority: 45,
              enforce: true,
            },
            muiTable: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Table|TableBody|TableCell|TableContainer|TableHead|TableRow|TableFooter)[\\/]/,
              name: 'mui-table',
              chunks: 'async',
              priority: 40,
              enforce: true,
            },
            muiFeedback: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Alert|Snackbar|Dialog|DialogTitle|DialogContent|DialogActions|Popover|Modal)[\\/]/,
              name: 'mui-feedback',
              chunks: 'async',
              priority: 35,
              enforce: true,
            },
            muiNav: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](BottomNavigation|BottomNavigationAction|Button|IconButton)[\\/]/,
              name: 'mui-nav',
              chunks: 'async',
              priority: 30,
              enforce: true,
            },
            dateFns: {
              test: /[\\/]node_modules[\\/]date-fns[\\/]/,
              name: 'date-fns',
              chunks: 'async',
              priority: 28,
              enforce: true,
              minSize: 10000,
            },
            datePickers: {
              test: /[\\/]node_modules[\\/]@mui[\\/]x-date-pickers[\\/]/,
              name: 'mui-date-pickers',
              chunks: 'async',
              priority: 25,
              enforce: true,
            },
            mainVendors: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|@remix-run)[\\/]/,
              name: 'main-vendors',
              chunks: 'initial',
              priority: 20,
              enforce: true,
            },
            features: {
              test: /[\\/]src[\\/](components|features)[\\/]/,
              name(module) {
                const match = module.context.match(/[\\/](components|features)[\\/](.*?)(?:[\\/]|$)/);
                const feature = match ? match[2] : 'common';
                if (['admin', 'dashboard'].includes(feature)) {
                  return 'feature-admin';
                }
                if (['time-off', 'time-entries'].includes(feature)) {
                  return 'feature-time';
                }
                return 'feature-common';
              },
              chunks: 'async',
              priority: 15,
              minSize: 10000,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        };

        // Add terser configuration for better minification
        webpackConfig.optimization.minimize = true;
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer || [];
        webpackConfig.optimization.minimizer.push(
          new (require('terser-webpack-plugin'))({
            terserOptions: {
              parse: {
                ecma: 8,
              },
              compress: {
                ecma: 5,
                warnings: false,
                comparisons: false,
                inline: 2,
                drop_console: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
                passes: 3,
                reduce_vars: true,
                collapse_vars: true,
                dead_code: true,
              },
              mangle: {
                safari10: true,
                keep_fnames: false,
              },
              output: {
                ecma: 5,
                comments: false,
                ascii_only: true,
              },
            },
            extractComments: false,
            parallel: true,
          })
        );

        // Add module concatenation for better tree shaking
        webpackConfig.optimization.concatenateModules = true;

        // Add bundle analyzer only when analyzing
        if (process.env.ANALYZE === 'true') {
          webpackConfig.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'server',
              analyzerPort: 8888,
              openAnalyzer: true,
              generateStatsFile: true,
              statsFilename: 'bundle-stats.json',
            })
          );
        }
      }

      // Configure script loading and cross-origin settings
      webpackConfig.output.crossOriginLoading = 'anonymous';

      // Modify HTMLWebpackPlugin to configure script and style loading
      const htmlWebpackPlugin = webpackConfig.plugins.find(
        plugin => plugin.constructor.name === 'HtmlWebpackPlugin'
      );

      if (htmlWebpackPlugin) {
        htmlWebpackPlugin.userOptions.inject = 'body';
        htmlWebpackPlugin.userOptions.scriptLoading = 'defer';
        
        // Add preload hints for CSS using template syntax
        const cssFiles = webpackConfig.plugins
          .find(plugin => plugin.constructor.name === 'MiniCssExtractPlugin')
          ?.options?.filename || 'static/css/[name].[contenthash:8].css';
          
        htmlWebpackPlugin.userOptions.links = [
          {
            rel: 'preload',
            as: 'style',
            href: cssFiles,
            type: 'text/css'
          }
        ];
      }

      // Add sharp-based image optimization
      webpackConfig.module.rules.push({
        test: /\.(webp|png|jpe?g)$/i,
        use: [
          {
            loader: 'sharp-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'static/media/',
              webp: {
                quality: 75,
                lossless: false,
                force: false
              },
              jpeg: {
                quality: 75,
                progressive: true
              },
              png: {
                quality: 75,
                compressionLevel: 9
              }
            }
          }
        ]
      });

      // Force newer versions of problematic packages
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'nth-check': path.resolve(__dirname, 'node_modules/nth-check'),
        'postcss': path.resolve(__dirname, 'node_modules/postcss'),
        'svgo': path.resolve(__dirname, 'node_modules/svgo')
      };

      // Update SVGO configuration
      const rules = webpackConfig.module.rules.find(rule => rule.oneOf);
      if (rules) {
        const svgLoader = rules.oneOf.find(rule => 
          rule.test && rule.test.toString().includes('svg')
        );
        if (svgLoader) {
          svgLoader.use = svgLoader.use.map(loader => {
            if (loader.loader && loader.loader.includes('@svgr/webpack')) {
              return {
                ...loader,
                options: {
                  ...loader.options,
                  svgoConfig: {
                    plugins: [
                      {
                        name: 'preset-default',
                        params: {
                          overrides: {
                            removeViewBox: false
                          }
                        }
                      }
                    ]
                  }
                }
              };
            }
            return loader;
          });
        }
      }

      // Add version and timestamp for service worker
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          'BUILD_VERSION': JSON.stringify(packageJson.version),
          'BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
        })
      );

      // Add bundle analyzer if enabled
      if (process.env.ANALYZE) {
        webpackConfig.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-report.html',
          })
        );
      }

      return webpackConfig;
    }
  }
};
