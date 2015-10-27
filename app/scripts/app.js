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
        feedStore = document.querySelector('iron-localstorage[name=podcasts]');
        //serializer = new XMLSerializer(),
        //images     = serializer.serializeToString(feed.xmlDocument)
        //  .match(/(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)(jpg|png|gif)/g);

    feed.entries.forEach(refitEntry);
    refitFeed(feed);

    // Storing in local storage
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

  // Podcast entry related functions
  function refitFeed(feed) {
    var image = feed.xmlDocument.querySelector('channel > image'),
        language = feed.xmlDocument.querySelector('language'),
        descriptionSnippet = feed.xmlDocument.querySelector('subtitle'),
        category = feed.xmlDocument.querySelector('category'),
        summary, author;

    // podcast cover image
    if (image && image.getAttribute('href')) {
      feed.cover = image.getAttribute('href');
    }

    //language and country
    if (language && language.textContent) {
      var langSplit = language.textContent.split('-');
      feed.language = langSplit[0];
      feed.country = langSplit[1];
    }

    // description snippet

    if (descriptionSnippet && descriptionSnippet.textContent) {
      feed.descriptionSnippet = descriptionSnippet.textContent;
    }

    //category
    if (category && category.getAttribute('text')) {
      feed.category = category.getAttribute('text');
    }

    if (!feed.description) {
      summary = feed.xmlDocument.querySelector('summary');
      if (summary && summary.textContent) {
        entry.description = summary.textContent;
      }
    }

    if (!feed.author) {
      author = feed.xmlDocument.querySelector('author');
      if (author && author.textContent) {
        feed.author = author.textContent;
      }
    }

    delete feed.xmlDocument;

    return feed;
  }

  function refitEntry(entry) {
    var track = entry.xmlNode.querySelector('enclosure'),
        cover = entry.xmlNode.querySelector('image'),
        summary, subtitle, author, duration;

    if (track) { entry.track = track.getAttribute('url'); }
    if (cover) { entry.cover = cover.getAttribute('href'); }

    if (!entry.content) {
      summary = entry.xmlNode.querySelector('summary');
      if (summary) { entry.content = summary.textContent; }
    }

    if (!entry.contentSnippet) {
      subtitle = entry.xmlNode.querySelector('subtitle');
      if (subtitle) { entry.contentSnippet = subtitle.textContent; }
    }

    if (!entry.author) {
      author = entry.xmlNode.querySelector('author');
      if (author) { entry.author = author.textContent; }
    }

    if (!entry.duration) {
      duration = entry.xmlNode.querySelector('duration');
      if (duration) { entry.duration = duration.textContent; }
    }

    delete entry.xmlNode;

    return entry;
  }

})(document);
