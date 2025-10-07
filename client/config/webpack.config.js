const path = require('path');
//const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../build'),
    publicPath: '/', // Ensure the public path is set correctly for routing
  },
  resolve: {
    fallback: {
      timers: require.resolve('timers-browserify'),
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/, // Add this rule for SVG files
        use: ['@svgr/webpack'],
      },
    ],
  },
  plugins: [
    //new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, '../public'), 
          to: path.resolve(__dirname, '../build'), 
          globOptions: { 
            ignore: ['**/uploads/**', '**/index.html'],
          } 
        },
      ],
    }),
  ],
  devtool: 'source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, '../public'),
    },
    compress: true,
    port: process.env.PORT || 3000,
    historyApiFallback: {
      index: '/index.html', // Redirect all unmatched routes to index.html
    },
    allowedHosts: [
      '.ngrok-free.app',
    ],
    host: '0.0.0.0',
    client: {
      logging: 'none',
    },
  },
};