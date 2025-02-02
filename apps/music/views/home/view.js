/* global View, Sanitizer */
'use strict';

var HomeView = View.extend(function HomeView() {
  View.call(this); // super();

  this.thumbnailCache = {};

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.tiles = document.getElementById('tiles');

  var loadTile = (tile) => {
    if (tile.dataset.loaded) {
      return;
    }

    this.getThumbnail(tile.dataset.filePath).then((url) => {
      var img = tile.querySelector('img');
      img.src = url;

      tile.dataset.loaded = true;
    });
  };

  this.onScroll = debounce((scrollTop) => {
    var scrollBottom = scrollTop + window.innerHeight;

    var tiles = this.tiles.querySelectorAll('.tile');
    var lastTileVisible = false;
    var tile, tileOffset;
    for (var i = 0, length = tiles.length; i < length; i++) {
      tile = tiles[i];
      tileOffset = tile.offsetTop;

      if (scrollTop <= tileOffset && tileOffset <= scrollBottom) {
        lastTileVisible = true;

        loadTile(tile);
      }

      else if (lastTileVisible) {
        return;
      }
    }
  }, 500);

  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));

  this.searchResults.addEventListener('open', () => {
    this.client.method('searchOpen');
    document.body.dataset.search = true;
  });

  this.searchResults.addEventListener('close', () => {
    this.client.method('searchClose');
    document.body.dataset.search = false;
    window.scrollTo(0, this.searchBox.HEIGHT);
  });

  this.searchResults.addEventListener('resultclick', (evt) => {
    var link = evt.detail;
    if (link) {
      if (link.dataset.section === 'songs') {
        this.queueSong(link.dataset.filePath);
      }

      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.tiles.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueAlbum(link.dataset.filePath);
    }
  });

  window.addEventListener('scroll', evt => this.onScroll(evt.pageY));

  window.scrollTo(0, this.searchBox.HEIGHT);

  this.searchResults.getItemImageSrc = (item) => this.getThumbnail(item.name);

  this.client.on('databaseChange', () => this.update());

  this.update();
});

HomeView.prototype.update = function() {
  this.getAlbums().then((albums) => {
    this.albums = albums;
    this.render();
  });
};

HomeView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

HomeView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  document.l10n.formatValues(
    'unknownArtist', 'unknownAlbum'
  ).then(([unknownArtist, unknownAlbum]) => {
    var html = [];

    this.albums.forEach((album) => {
      var template =
Sanitizer.createSafeHTML `<a class="tile"
    href="/player"
    data-artist="${album.metadata.artist || unknownArtist}"
    data-album="${album.metadata.album || unknownAlbum}"
    data-file-path="${album.name}">
  <img>
</a>`;

      html.push(template);
    });

    this.tiles.innerHTML = Sanitizer.unwrapSafeHTML(...html);

    this.onScroll(window.scrollY);
  });
};

HomeView.prototype.getAlbums = function() {
  return this.fetch('/api/albums/list').then(response => response.json());
};

HomeView.prototype.getThumbnail = function(filePath) {
  if (this.thumbnailCache[filePath]) {
    return Promise.resolve(this.thumbnailCache[filePath]);
  }

  return this.fetch('/api/artwork/url/thumbnail/' + filePath)
    .then((response) => response.json())
    .then((url) => {
      this.thumbnailCache[filePath] = url;
      return url;
    });
};

HomeView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

HomeView.prototype.queueSong = function(filePath) {
  this.fetch('/api/queue/song/' + filePath);
};

HomeView.prototype.search = function(query) {
  if (!query) {
    return Promise.resolve(this.searchResults.clearResults());
  }

  var results = [];

  return document.l10n.formatValues(
    'unknownTitle', 'unknownArtist', 'unknownAlbum'
  ).then(([unknownTitle, unknownArtist, unknownAlbum]) => {
    var albumResults = this.fetch('/api/search/album/' + query)
      .then(response => response.json())
      .then((albums) => {
        var albumResults = albums.map((album) => {
          return {
            name:     album.name,
            title:    album.metadata.album  || unknownAlbum,
            subtitle: album.metadata.artist || unknownArtist,
            section:  'albums',
            url:      '/album-detail?id=' + encodeURIComponent(album.name)
          };
        });

        results = results.concat(albumResults);

        this.searchResults.setResults(results);
        return albumResults;
      });

    var artistResults = this.fetch('/api/search/artist/' + query)
      .then(response => response.json())
      .then((artists) => {
        var artistResults = artists.map((artist) => {
          return {
            name:     artist.name,
            title:    artist.metadata.artist || unknownArtist,
            subtitle: '',
            section:  'artists',
            url:      '/artist-detail?id=' + encodeURIComponent(artist.name)
          };
        });

        results = results.concat(artistResults);

        this.searchResults.setResults(results);
        return artistResults;
      });

    var songResults = this.fetch('/api/search/title/' + query)
      .then(response => response.json())
      .then((songs) => {
        var songResults = songs.map((song) => {
          return {
            name:     song.name,
            title:    song.metadata.title  || unknownTitle,
            subtitle: song.metadata.artist || unknownArtist,
            section:  'songs',
            url:      '/player'
          };
        });

        results = results.concat(songResults);

        this.searchResults.setResults(results);
        return songResults;
      });

    return Promise.all([albumResults, artistResults, songResults]).then(() => {
      return results;
    });
  });
};

function debounce(fn, ms) {
  var timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

window.view = new HomeView();
