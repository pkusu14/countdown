/* Interactive map of the shared Google list.
 *
 * Google will not let a saved list sit inside an iframe, so the pins are
 * drawn here on OpenStreetMap. Tap a pin for the name; the footer still
 * opens the real list in the Maps app. Leaflet is optional: if it fails
 * to load, the card is just the link. */

(function () {
  'use strict';

  var map = null;

  function places() {
    var data = window.PLACES || {};
    return {
      name: data.name || 'Places we saved',
      url: data.url || 'https://maps.app.goo.gl/7NY8ZspvaJhkt3SC8',
      items: (data.items || []).filter(function (p) {
        return p && typeof p.lat === 'number' && typeof p.lng === 'number';
      })
    };
  }

  function mapsUrl(item) {
    return 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(item.lat + ',' + item.lng);
  }

  function mount() {
    var el = document.getElementById('us-map');
    var foot = document.getElementById('map-open');
    if (!el) return;

    var data = places();
    if (foot) {
      foot.href = data.url;
      foot.textContent = (data.name || 'Places we saved') + ' \u00b7 open in Google Maps';
    }

    if (!window.L || !data.items.length) return;
    if (map) return;

    map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var icon = L.divIcon({
      className: 'map-dot',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10]
    });

    var group = L.featureGroup();
    data.items.forEach(function (item) {
      var mark = L.marker([item.lat, item.lng], { icon: icon });
      var html = '<strong>' + escapeHtml(item.name) + '</strong>' +
        (item.address ? '<br><span>' + escapeHtml(item.address) + '</span>' : '') +
        '<br><a href="' + mapsUrl(item) + '" target="_blank" rel="noopener">open in Maps</a>';
      mark.bindPopup(html);
      group.addLayer(mark);
    });
    group.addTo(map);

    map.fitBounds(group.getBounds().pad(0.18));
    setTimeout(function () { map.invalidateSize(); }, 80);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.USMAP = { mount: mount };

  function boot() { mount(); }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
