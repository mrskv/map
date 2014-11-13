require.config({
  paths: {
    jquery: 'bower_components/jquery/dist/jquery.min',
    underscore: 'bower_components/underscore/underscore',
    backbone: 'bower_components/backbone/backbone'
  }
});

require(['js/App.js', 'bower_components/marionette/lib/backbone.marionette.min'], function() {
    App.init();
});
