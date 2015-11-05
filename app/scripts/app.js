/* global Excess, _ */
/*
Copyright (c) 2015 Enrique Arias Cerveró. All rights reserved.
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
    // imports are loaded and elements have been registered
  });

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

  app.play = function(ev) {
    if (!ev.detail || !ev.detail.track) {
      console.log('no track to play!');
    } else {
      var entry  = ev.detail,
          player = document.querySelector('podcaster-player'),
          panel  = document.querySelector('.panelBottom iron-collapse');

      // When the currentEntry target does not match
      // the incoming event current target means
      // that another card has has been clicked to play
      // so the current entry must be stopped
      if (app.currentTarget && app.currentTarget !== ev.currentTarget) {
        app.currentTarget.playing(false);
      }

      if (!entry.playing) {
        app.currentTarget = ev.currentTarget;
        app.currentEntry = entry;
      }

      player.play();
      panel.show();
    }
  };

  app.pause = function(ev) {
    if (ev.detail) {
      var player = document.querySelector('podcaster-player');
      ev.detail.playing = false;
      player.pause();
    }
  };

  app.handlePlay = function(ev) {
    if (ev.detail.title === app.currentEntry.title) {
      app.currentTarget.playing(true);
      var mc = document.querySelector('#mainContainer'),
          pb = document.querySelector('.panelBottom');

      mc.style.paddingBottom = pb.offsetHeight + 'px';
    }
  };

  app.handlePause = function(ev) {
    if (ev.detail.title === app.currentEntry.title) {
      app.currentTarget.playing(false);
    }
  };

  addEventListener('google-feeds-response', function showData (ev) {
    var feed      = ev.detail.feed,
        feedStore = document.querySelector('iron-localstorage[name=podcasts]');
        //serializer = new XMLSerializer(),
        //images     = serializer.serializeToString(feed.xmlDocument)
        //  .match(/(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)(jpg|png|gif)/g);

    if (!app.podcasts) { app.podcasts = []; }
    app.podcasts.push(feed);

    var index = app.podcasts.indexOf(feed);
    feed.entries.forEach(refitEntry.bind(this, index));
    refitFeed(feed);

    // Storing in local storage
    feedStore.value = app.podcasts;
    feedStore.save();
    feedStore.reload();
  });

  /*document.querySelector('iron-localstorage[name=lastAudio]').addEventListener('iron-localstorage-load', function(ev) {
    console.log('iron-localstorage[name=lastAudio]', ev);
    //TODO Load currentEntry and currentPodcast
  });*/

  window.onbeforeunload = function() {
    var podcastStorage = document.querySelector('iron-localstorage[name=podcasts]'),
        lastAudioStorage = document.querySelector('iron-localstorage[name=lastAudio]');


    podcastStorage.save();

    return 'what you are doing';
  }

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
        feed.description = summary.textContent;
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

  function refitEntry(podcastIndex, entry) {
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

    entry.podcastIndex = podcastIndex;
    delete entry.xmlNode;

    return entry;
  }

})(document);
