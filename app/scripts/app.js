/* global Excess, _ */
/*
Copyright (c) 2015 Enrique Arias Cerveró. All rights reserved.
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app'), countries, lookupResults, trends,
      trendsUrl = 'https://itunes.apple.com/es/rss/toppodcasts/limit=10/xml';

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
    // imports are loaded and elements have been registered
  });

  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
    var feedLoader = document.getElementById('feedLoader'),
        feedTrends = document.getElementById('feedTrends');

    app.currentEntry = false; // Set falsy to prevent not being shown he podcasts list
    // Add listener when podcast feed is added
    feedLoader.addEventListener('google-feeds-response', loadFeed);
    feedTrends.addEventListener('google-feeds-response', loadTrends);

    // Check podcast trends once loaded
    feedTrends.feed = trendsUrl;
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

  app.showEntries = function(ev) {
    var pID = ev.currentTarget.querySelector('input[name=podcast-id]');
    if (pID && pID.value) {
      Excess.RouteManager.transitionTo('/podcast/' + pID.value);
    }
  };

  app.play = function(ev) {
    if (!ev.detail || !ev.detail.track) {
      console.log('no track to play!');
    } else {
      var entry  = ev.detail,
          player = document.querySelector('podcaster-player'),
          panel  = document.querySelector('podcaster-panel');

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
    }
  };

  app.pause = function(ev) {
    if (ev.detail) {
      var player = document.querySelector('podcaster-player');
      ev.detail.playing = false;
      player.pause();
    }
  };

  app.handlePlay = function() {
    var panel = document.querySelector('podcaster-panel');
    panel.show();
    app.currentTarget && app.currentTarget.playing(true);
  };

  app.handlePause = function(ev) {
    if (ev.detail.title === app.currentEntry.title) {
      app.currentTarget.playing(false);
    }
  };

  app.handlePlayerError = function() {
    if (app.currentTarget) {
      app.currentTarget.playing(false);
      app.currentTarget.loading(false);
    }
  };

  app.handleOpenedPanel = function(ev) {
    var player = document.querySelector('podcaster-player');
    if (player.audio.title === app.currentEntry.title) {
      var mc = document.querySelector('#mainContainer');
      mc.style.paddingBottom = ev.detail.offsetHeight + 'px';
    }
  };

  app.handleCountries = function(ev) {
    countries = ev.detail.feed;
    console.log('countries', countries);
  };

  app.handleTrends = function(ev) {
    trends = ev.detail.feed;
    console.log('trends', trends);
    app.podcastTrends = ev.detail.feed;
  };

  app.handleLookup = function(ev) {
    //TODO check if there is more than one result
    //show the matched results for selection
    lookupResults = ev.detail.results;
    console.log('lookupResults', lookupResults);
  };



  /* GLOBAL LISTENERS */
  window.onbeforeunload = function() {
    var podcastStorage = document.querySelector('iron-localstorage[name=podcasts]');
    podcastStorage.save();
    //return 'what you are doing';
  };

  /* FUNCTIONS */
  function loadFeed(ev) {
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
  };

  function loadTrends(ev) {
    console.log(ev);
    var feed = ev.detail.feed;
    if (feed) {
      feed.entries.forEach(refitTrendFeed);
      app.podcastTrends = feed.entries;
    }
  };

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

  function refitTrendFeed(feed) {
    var images = feed.xmlNode.querySelectorAll('image'),
        category = feed.xmlNode.querySelector('category');

    if (images) {
      var imgTag = _.reduce(images, function(memo, image) {
        return parseInt(image.getAttribute('height')) > parseInt(memo.getAttribute('height')) ? image : memo;
      });
      feed.cover = imgTag.textContent;
    }

    // Get the translated category name
    if (category) {
      feed.category = category.getAttribute('label');
    }

    return feed;
  }

})(document);
