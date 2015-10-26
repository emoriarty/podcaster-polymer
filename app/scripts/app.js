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
    app.currentEntry = false; // Set falsy to prevent not being shown he podcasts list
  });

  app.showAddPodcastDialog = function() {
    var dialog = document.getElementById('addPodcastDlg');
    dialog.open();
  };

  app.addPodcast = function() {
    var feedUrl    = document.querySelector('#addPodcastDlg input').value,
        feedLoader = document.getElementById('feedLoader');

    if (!app.podcasts || !_.findWhere(app.podcasts, {feedUrl: feedUrl})) {
      feedLoader.feed = feedUrl;
    }
  };

  app.checkPodcasts = function(ev) {
    console.log('load empty', ev);
  };

  app.showEntries = function() {
    var pID = this.querySelector('input[name=podcast-id]');
    if (pID && pID.value) {
      Excess.RouteManager.transitionTo('/podcast/' + pID.value);
    }
  };

  app.showEntry = function() {
    var eID = this.querySelector('input[name=entry-id]');
    if (eID && eID.value) {
      Excess.RouteManager.transitionTo('/podcast/' + app.podcastId + '/'+ eID.value);
    }
  };

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
    // imports are loaded and elements have been registered
  });

  addEventListener('google-feeds-response', function showData (ev) {
    var feed      = ev.detail.feed,
        feedStore = document.querySelector('iron-localstorage[name=podcasts]'),
        image     = feed.xmlDocument.querySelector('image');
        //serializer = new XMLSerializer(),
        //images     = serializer.serializeToString(feed.xmlDocument)
        //  .match(/(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)(jpg|png|gif)/g);

    if (image) {
      feed.cover = image.getAttribute('href');
    }

    // Store track in a properly way
    _.each(feed.entries, function(entry) {
      var track = entry.xmlNode.querySelector('enclosure'),
          cover = entry.xmlNode.querySelector('image'),
          summary;
      track && (entry.track = track.getAttribute('url'));
      cover && (entry.cover = cover.getAttribute('href'));

      if (!entry.content) {
        summary = entry.xmlNode.querySelector('summary');
        summary && (entry.content = summary.textContent);
      }
      delete entry.xmlNode;
    })

    delete feed.xmlDocument;

    if (!app.podcasts) {
      app.podcasts = [];
      app.podcasts.push(feed);
    } else {
      app.podcasts.push(feed);
      feedStore.value = app.podcasts;
      feedStore.save();
      feedStore.reload();
    }
  });

  addEventListener('iron-localstorage-load', function() {
    console.log(app.podcasts);
  });

})(document);
