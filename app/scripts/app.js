/*jshint -W117 */
/*
Copyright (c) 2015 Enrique Arias Cerveró. All rights reserved.
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  app.displayInstalledToast = function() {
    // Check to make sure caching is actually enabled—it won't be in the dev environment.
    if (!document.querySelector('platinum-sw-cache').disabled) {
      document.querySelector('#caching-complete').show();
    }
  };

  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
    console.log('Our app is ready to rock!');
    // manual start because we are inside dom-bind template
    //Excess.RouteManager.start();
  });

  app.showAddPodcastDialog = function() {
    var dialog = document.getElementById('addPodcastDlg');
    dialog.open();
  };

  app.addPodcast = function() {
    var feedUrl    = document.querySelector('#addPodcastDlg input').value,
        feedLoader = document.getElementById('feedLoader');

    if (!app.podcastsList || !_.findWhere(app.podcastsList, {feedUrl: feedUrl})) {
      feedLoader.feed = feedUrl;
    }
  };

  app.checkPodcasts = function(ev) {
    console.log('load empty', ev);
  };

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
    // imports are loaded and elements have been registered
  });

  addEventListener('google-feeds-response', function showData (ev) {
    var feed       = ev.detail.feed,
        feedStore  = document.querySelector('iron-localstorage[name=podcasts]'),
        serializer = new XMLSerializer(),
        images     = serializer.serializeToString(feed.xmlDocument)
          .match(/(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)(jpg|png|gif)/g);

    if (images && images.length > 0) {
      feed.images = images;
      feed.cover = images[0];
      console.log('cover', feed.cover);
      delete feed.xmlDocument;
    }

    if (!app.podcastsList) {
      app.podcastsList = [];
      app.podcastsList.push(feed);
    } else {
      app.podcastsList.push(feed);
      feedStore.value = app.podcastsList;
      feedStore.save();
      feedStore.reload();
    }
  });

  addEventListener('iron-localstorage-load', function(ev) {
    console.log('local storage load', ev);
    console.log(app.podcastsList);
  });

})(document);
