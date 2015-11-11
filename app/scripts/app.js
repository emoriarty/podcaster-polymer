/* global Excess, _ */
/*
Copyright (c) 2015 Enrique Arias Cerveró. All rights reserved.
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app'),
      PODCAST_TYPES, COUNTRIES, COMMON_TRANSLATIONS = {}, MEDIA_TRANSLATIONS = {},
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

    // Fetch all the iTunes data
    fetchItunesData(function() {
      var settingsStorage = document.querySelector('iron-localstorage[name=settings]'),
          settings = settingsStorage.value,
          countryData = _.findWhere(COUNTRIES, {country_code: settings.countryCode});

      app.countryCode = settings.countryCode;
      if (countryData) {

        fetchTranslations(countryData.language);
      }
    });

    // Set falsy to prevent not being shown he podcasts list
    app.currentEntry = false;
    app.podcastTrends = false;

    // Add listener when podcast feed is added
    feedLoader.addEventListener('google-feeds-response', loadFeed);
    feedTrends.addEventListener('google-feeds-response', loadTrends);
  });


  app.addPodcast = function() {
    addPodcastFeed(document.querySelector('#addPodcastDlg input').value);
  };

  app.addTrendPodcast = function(ev) {
    var feedLoader = document.getElementById('feedLoader'),
        lookupId = ev.currentTarget.parentNode.parentNode.parentNode.querySelector('[name=lookupId]').value,
        lookup = document.querySelector('byutv-jsonp#lookup');

    if (lookupId && lookup) {
      lookup.params = {id: lookupId};
      lookup.generateRequest();
    }
  };

  /* STORAGE FUNCTIONS */
  app.checkPodcasts = function(ev) {
    console.log('load empty', ev);
  };

  app.checkSettings = function(ev) {
    var locales = navigator.language.split('-'),
        country = locales.length === 2 ? locales[1].toLowerCase() : 'us',
        settingsStorage = ev.currentTarget;

    if (_.findWhere(COUNTRIES, {country_code: country})) {
      settingsStorage.value = {countryCode: country};
    } else {
      settingsStorage.value = {countryCode: 'us'};
    }
    settingsStorage.save();
    settingsStorage.reload();
  };

  /* NAVIGATION */
  app.showEntries = function(ev) {
    var pID = ev.currentTarget.querySelector('input[name=podcast-id]');
    if (pID && pID.value) {
      Excess.RouteManager.transitionTo('/podcast/' + pID.value);
    }
  };

  app.showAddPodcastDialog = function() {
    var dialog = document.getElementById('addPodcastDlg');
    dialog.open();
  };

  app.showSettings = function() {
    var settingsStorage = document.querySelector('iron-localstorage[name=settings]'),
        settings = settingsStorage.value,
        dialog = document.getElementById('settingsDlg');
    dialog.open();
  };

  /* PLAYER ACTIONS */
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

  /* HANDLE LISTENERS */
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

  app.handleTrends = function(ev) {
    app.podcastTrends = ev.detail.feed;
  };

  app.handleLookup = function(ev) {
    var lookupResults = ev.detail.results;
    if (lookupResults.length == 1) {
      addPodcastFeed(lookupResults[0].feedUrl);
    } else {
      // TODO more than one result
    }
  };

  app.handleSubroute = function(ev) {
    switch (ev.detail.name) {
      case 'trends':
        app.currentTab = 1;
        // Fetch trends
        feedTrends.feed = composeTrendsUrl();
        break;
      default:
        app.currentTab = 0;
    }
  };

  app.handleGenre = function(ev) {
    feedTrends.feed = composeTrendsUrl({genre: ev.detail.item.id});
  };

  app.handleCountry = function(ev) {
    var settingsStorage = document.querySelector('iron-localstorage[name=settings]'),
        settings = settingsStorage.value;

    if (settings.countryCode !== ev.detail.item.id) {
      settings.countryCode = ev.detail.item.id;
      settingsStorage.value = settings;
      settingsStorage.save();
      settingsStorage.reload();
      location.href = location.origin;
    }
  };

  /* GLOBAL LISTENERS */
  window.onbeforeunload = function() {
    var podcastStorage = document.querySelector('iron-localstorage[name=podcasts]');
    podcastStorage.save();
    //return 'what you are doing';
  };

  /* FUNCTIONS */
  function addPodcastFeed(feedUrl) {
    if (!feedUrl) return;

    var feedLoader = document.getElementById('feedLoader');

    if (!app.podcasts || !_.findWhere(app.podcasts, {feedUrl: feedUrl})) {
      feedLoader.feed = feedUrl;
    }
  }

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
        category = feed.xmlNode.querySelector('category'),
        itunesId = feed.link.match(/id(\d+)/);

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

    if (itunesId && itunesId.length > 1) {
      feed.lookupId = itunesId[1];
    }

    return feed;
  }

  function fetchItunesData(cb) {
    var podcastTypes;

    fetchPodcastTypes();
    fetchCountries(cb);
  }

  function fetchPodcastTypes() {
    YUI().use('yql', function(Y) {
      Y.YQL('select * from html where url=\'https://rss.itunes.apple.com/data/media-types.json\'', function(r) {
        PODCAST_TYPES = JSON.parse(r.query.results.body);
        PODCAST_TYPES = _.findWhere(PODCAST_TYPES, {store: 'podcast'});
        console.log('PODCAST_TYPES', PODCAST_TYPES);
      });
    });
  }

  function fetchCountries(cb) {
    YUI().use('yql', function(Y) {
      Y.YQL('select * from html where url=\'https://rss.itunes.apple.com/data/countries.json\'', function(r) {
        COUNTRIES = JSON.parse(r.query.results.body);

        COUNTRIES = _.inject(COUNTRIES, function(memo, country) {
          if (country.stores.podcast) {
            memo.push(country);
          }
          return memo;
        }, []);

        console.log('COUNTRIES', COUNTRIES);
        cb && cb();
      });
    });
  }

  function fetchTranslations(lang) {
    lang = lang || 'en-US';

    YUI().use('yql', function(Y) {
      Y.YQL('select * from html where url=\'https://rss.itunes.apple.com/data/lang/' + lang + '/common.json\'', function(r) {
        COMMON_TRANSLATIONS = JSON.parse(r.query.results.body);
        console.log('COMMON_TRANSLATIONS', COMMON_TRANSLATIONS);

        COMMON_TRANSLATIONS.countries = Object.keys(COMMON_TRANSLATIONS.feed_country)
          .map(function(k, index) {
            if (k === app.countryCode) {
              console.log(k, index);
              app.selectedCountry = index;
            }
            return {code: k, name: COMMON_TRANSLATIONS.feed_country[k]}
          });

        app.commonTranslations = COMMON_TRANSLATIONS;
      });

      Y.YQL('select * from html where url=\'https://rss.itunes.apple.com/data/lang/' + lang + '/media-types.json\'', function(r) {
        MEDIA_TRANSLATIONS = JSON.parse(r.query.results.body);
        console.log('MEDIA_TRANSLATIONS', MEDIA_TRANSLATIONS);
        MEDIA_TRANSLATIONS.subgenres = _.map(PODCAST_TYPES.subgenres, function(obj) {
          return { name: MEDIA_TRANSLATIONS[obj.translation_key], id: obj.id };
        });

        app.mediaTranslations = MEDIA_TRANSLATIONS;
      });
    });
  }

  function composeTrendsUrl(opts) {
    opts = opts || {};

    var url = PODCAST_TYPES.feed_types[0].urlPrefix.replace('<%= country_code %>', app.countryCode),
        params = 'limit=' + (opts.limit || 25) + '/';

    if (opts.genre && opts.genre.length > 0) { params = params.concat('genre=', opts.genre, '/'); }

    return url.replace('<%= parameters %>', params) + PODCAST_TYPES.feed_types[0].urlSuffix;
  }

})(document);
