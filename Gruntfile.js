/* eslint strict: 0 */

'use strict';

const babel = require('./tasks/babel-cli');

module.exports = grunt => {
  require('load-grunt-tasks')(grunt);
  require('./tasks/grunt-filetransform')(grunt);

  const config = {
    filetransform: {
      impl: {
        options: {
          transformer: babel,
          env: 'impl'
        },
        files: [{
          expand: true,
          cwd: 'impl/',
          src: ['**/*.es6'],
          ext: '.compiled.js',
          dest: 'impl/'
        }]
      },
      dist: {
        options: {
          transformer: babel,
          env: 'dist'
        },
        files: [{
          expand: true,
          cwd: 'src/',
          src: ['**/*.es6', '*.es6'],
          ext: '.compiled.js',
          dest: 'dist/'
        }, {
          expand: true,
          cwd: 'tests/',
          src: ['**/*.es6', '*.es6'],
          ext: '.compiled.js',
          dest: 'tests/'
        }]
      }
    },
    clean: {
      all: ['dist/', './**/*.compiled.js', './**/*.compiled.js.map']
    }
  };

  grunt.initConfig(config);

  grunt.registerTask('compile', [
    'clean',
    'filetransform'
  ]);


  grunt.registerTask('build', [
    'clean',
    'compile'
  ]);

  grunt.registerTask('production', [
    'build'
  ]);

  grunt.registerTask('default', 'build');
};
