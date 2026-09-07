/* Spotify app settings.

   The Client ID is public by design - PKCE means there is no secret in the
   app. Until it's filled in, the listening rows simply don't appear.

   Redirect URIs that must be listed in the Spotify dashboard, exactly:
     https://pkusu14.github.io/countdown/
     http://127.0.0.1:8130/
*/

window.SPOTIFY_CONFIG = {
  clientId: ''
};
