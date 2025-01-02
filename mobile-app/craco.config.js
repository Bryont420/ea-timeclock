/**
 * @fileoverview CRACO (Create React App Configuration Override) configuration
 * Customizes the Create React App webpack configuration without ejecting.
 * Implements:
 * - Code splitting and chunking strategies
 * - Bundle optimization and minification
 * - Development and production environment configurations
 * - Module aliasing and path resolution
 */

const path = require('path');

/**
 * Conditionally import bundle analyzer
 * Only loaded when ANALYZE environment variable is true
 */
let BundleAnalyzerPlugin;
if (process.env.ANALYZE === 'true') {
  BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
}

/**
 * Import TerserPlugin for production minification
 */
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizations
      if (env === 'production') {
        // Enable aggressive tree shaking
        webpackConfig.optimization.sideEffects = true;
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.providedExports = true;

        /**
         * Configure code splitting and chunking
         * - Splits bundles for optimal loading
         * - Groups common dependencies
         * - Implements size limits
         */
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 120000,
          minChunks: 1,
          maxAsyncRequests: 15,
          maxInitialRequests: 6,
          automaticNameDelimiter: '-',
          cacheGroups: {
            /**
             * Material-UI core components bundle
             * Includes frequently used base components
             */
            muiCore: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Box|Typography|Container|CssBaseline|CircularProgress)[\\/]/,
              name: 'mui-core',
              chunks: 'initial',
              priority: 60,
              enforce: true,
            },
            /**
             * Material-UI icons bundle
             * Loaded asynchronously to reduce initial bundle size
             */
            muiIcons: {
              test: /[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/,
              name: 'mui-icons',
              chunks: 'async',
              priority: 55,
              enforce: true,
            },
            /**
             * Material-UI form components bundle
             * Groups form-related components for better caching
             */
            muiForm: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](TextField|Select|MenuItem|FormControl|InputLabel|FormControlLabel|Checkbox)[\\/]/,
              name: 'mui-form',
              chunks: 'async',
              priority: 50,
              enforce: true,
              reuseExistingChunk: true,
            },
            /**
             * Material-UI inputs bundle
             * Groups input-related components for better caching
             */
            muiInputs: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Select|FilledInput|OutlinedInput|Input|InputBase)[\\/]/,
              name: 'mui-inputs',
              chunks: 'async',
              priority: 48,
              enforce: true,
              reuseExistingChunk: true,
            },
            /**
             * Material-UI layout components bundle
             * Groups layout-related components for better caching
             */
            muiLayout: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Card|Grid|Paper|AppBar|Toolbar|Divider)[\\/]/,
              name: 'mui-layout',
              chunks: 'async',
              priority: 45,
              enforce: true,
            },
            /**
             * Material-UI table components bundle
             * Groups table-related components for better caching
             */
            muiTable: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Table|TableBody|TableCell|TableContainer|TableHead|TableRow|TableFooter)[\\/]/,
              name: 'mui-table',
              chunks: 'async',
              priority: 40,
              enforce: true,
            },
            /**
             * Material-UI feedback components bundle
             * Groups feedback-related components for better caching
             */
            muiFeedback: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](Alert|Snackbar|Dialog|DialogTitle|DialogContent|DialogActions|Popover|Modal)[\\/]/,
              name: 'mui-feedback',
              chunks: 'async',
              priority: 35,
              enforce: true,
            },
            /**
             * Material-UI navigation components bundle
             * Groups navigation-related components for better caching
             */
            muiNav: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/](esm|umd|system)[\\/](BottomNavigation|BottomNavigationAction|Button|IconButton)[\\/]/,
              name: 'mui-nav',
              chunks: 'async',
              priority: 30,
              enforce: true,
            },
            /**
             * Date-fns library bundle
             * Groups date-related functions for better caching
             */
            dateFns: {
              test: /[\\/]node_modules[\\/]date-fns[\\/]/,
              name: 'date-fns',
              chunks: 'async',
              priority: 28,
              enforce: true,
              minSize: 10000,
            },
            /**
             * Material-UI date pickers bundle
             * Groups date picker-related components for better caching
             */
            datePickers: {
              test: /[\\/]node_modules[\\/]@mui[\\/]x-date-pickers[\\/]/,
              name: 'mui-date-pickers',
              chunks: 'async',
              priority: 25,
              enforce: true,
            },
            /**
             * Main vendor libraries bundle
             * Groups main vendor libraries for better caching
             */
            mainVendors: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|@remix-run)[\\/]/,
              name: 'main-vendors',
              chunks: 'initial',
              priority: 20,
              enforce: true,
            },
            /**
             * Features bundle
             * Groups feature-related components for better caching
             */
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
            /**
             * Default bundle
             * Catches any remaining modules
             */
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        };

        /**
         * Configure Terser minification options
         * Optimizes for production while maintaining compatibility
         */
        webpackConfig.optimization.minimize = true;
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer || [];
        webpackConfig.optimization.minimizer.push(
          new TerserPlugin({
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

      return webpackConfig;
    }
  }
};
