/* Interactive map of the shared Google list.
 *
 * Google will not let a saved list sit inside an iframe, so the pins are
 * drawn here. Refresh asks our Worker for the live list, then redraws.
 * Leaflet is optional: if it fails to load, the card is just the link. */

(function () {
  'use strict';

  var STORE_KEY = 'us.places.v1';
  var LIST_ID = 'o2qJGU_-WpfMiZK5ZNfTSg';
  var GETLIST = 'https://www.google.com/maps/preview/entitylist/getlist?hl=en&gl=us&pb=!1m1!1s' +
    LIST_ID + '!2e2!3e2!4i10000!16b1';
  var map = null;
  var layer = null;

  function baked() {
    return window.PLACES || { name: 'Places we saved', url: 'https://maps.app.goo.gl/7NY8ZspvaJhkt3SC8', items: [] };
  }

  function loadLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY));
      if (raw && Array.isArray(raw.items) && raw.items.length) return raw;
    } catch (e) {}
    return null;
  }

  function saveLocal(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
    window.PLACES = data;
  }

  function current() {
    var data = loadLocal() || baked();
    return {
      name: data.name || 'Places we saved',
      url: data.url || baked().url,
      items: (data.items || []).filter(function (p) {
        return p && typeof p.lat === 'number' && typeof p.lng === 'number';
      })
    };
  }

  function mapsUrl(item) {
    return 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(item.lat + ',' + item.lng);
  }

  function workerUrl() {
    var cfg = window.PUSH_CONFIG || {};
    return cfg.worker ? cfg.worker.replace(/\/$/, '') + '/places' : '';
  }

  function parseList(text) {
    var marker = text.indexOf(")]}'");
    if (marker >= 0) text = text.slice(marker + 4);
    var start = text.indexOf('[[');
    if (start < 0) throw new Error('no list');
    var data = JSON.parse(text.slice(start));
    var row = data && data[0];
    var raw = row && row[8];
    if (!Array.isArray(raw) || !raw.length) throw new Error('empty list');

    var items = raw.map(function (p) {
      var loc = p && p[1];
      var coords = loc && loc[5];
      return {
        name: String((p && p[2]) || '').slice(0, 80),
        address: String((loc && loc[2]) || '').slice(0, 120),
        lat: coords && typeof coords[2] === 'number' ? coords[2] : null,
        lng: coords && typeof coords[3] === 'number' ? coords[3] : null
      };
    }).filter(function (p) { return p.name && p.lat != null && p.lng != null; });

    if (!items.length) throw new Error('no pins');
    return {
      name: String((row && row[4]) || 'Places we saved').slice(0, 80),
      url: baked().url,
      items: items,
      at: Date.now()
    };
  }

  function fetchLive() {
    return fetch('https://r.jina.ai/' + GETLIST)
      .then(function (res) {
        if (!res.ok) throw new Error('jina ' + res.status);
        return res.text();
      })
      .then(parseList)
      .catch(function () {
        var url = workerUrl();
        if (!url) throw new Error('no worker');
        return fetch(url).then(function (res) {
          if (!res.ok) throw new Error('worker ' + res.status);
          return res.json();
        }).then(function (data) {
          if (!data || !Array.isArray(data.items) || !data.items.length) throw new Error('empty');
          return data;
        });
      });
  }

  function updateFoot(data) {
    var foot = document.getElementById('map-open');
    if (!foot) return;
    foot.href = data.url || baked().url;
    foot.textContent = (data.name || 'Places we saved') + ' \u00b7 open in Google Maps';
  }

  function pinIcon() {
    return L.divIcon({
      className: 'map-dot',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10]
    });
  }

  function ensureMap() {
    var el = document.getElementById('us-map');
    if (!el || !window.L) return null;
    if (map) return map;

    map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    return map;
  }

  function draw(data) {
    data = data || current();
    updateFoot(data);

    var m = ensureMap();
    if (!m || !data.items.length) return;

    if (layer) m.removeLayer(layer);
    layer = L.featureGroup();

    var icon = pinIcon();
    data.items.forEach(function (item) {
      var mark = L.marker([item.lat, item.lng], { icon: icon });
      var html = '<strong>' + escapeHtml(item.name) + '</strong>' +
        (item.address ? '<br><span>' + escapeHtml(item.address) + '</span>' : '') +
        '<br><a href="' + mapsUrl(item) + '" target="_blank" rel="noopener">open in Maps</a>';
      mark.bindPopup(html);
      layer.addLayer(mark);
    });
    layer.addTo(m);
    m.fitBounds(layer.getBounds().pad(0.18));
    setTimeout(function () { m.invalidateSize(); }, 80);
  }

  function apply(data) {
    if (!data || !data.items || !data.items.length) return;
    saveLocal(data);
    draw(data);
  }

  function refresh() {
    var btn = document.getElementById('map-refresh');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
    }

    return fetchLive()
      .then(function (data) {
        apply(data);
        if (window.SYNC && SYNC.isReady() && SYNC.setPlaces) SYNC.setPlaces(data);
        return data.items.length;
      })
      .then(function (n) {
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('is-busy');
        }
        return n;
      }, function (err) {
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('is-busy');
        }
        throw err;
      });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.USMAP = { mount: draw, apply: apply, refresh: refresh };

  function boot() { draw(); }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
